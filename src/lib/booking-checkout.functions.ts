import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';
import { BOOKING_PACKAGES } from '@/lib/booking-packages';
import { validateReturnUrl } from '@/lib/validate-return-url';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const Schema = z.object({
  bookingId: z.string().uuid(),
  packageId: z.string().min(1).max(60),
  returnUrl: z.string().url().refine((u) => {
    try { validateReturnUrl(u); return true; } catch { return false; }
  }, { message: 'returnUrl must be on the application domain' }),
  environment: z.enum(['sandbox', 'live']) as z.ZodType<StripeEnv>,
});

export const createBookingCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Schema.parse(data))
  .handler(async ({ data, context }) => {
    const pkg = BOOKING_PACKAGES[data.packageId];
    if (!pkg) throw new Error('Unknown package');

    const { data: isAdmin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError) throw new Error('Booking is unavailable');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const supabase = supabaseAdmin;
    let query = supabase.from(pkg.table).select('id, user_id, email, full_name, status, stripe_session_id').eq('id', data.bookingId);
    if (!isAdmin) query = query.eq('user_id', context.userId);
    const { data: booking, error } = await query.maybeSingle();
    if (error || !booking) throw new Error('Booking is unavailable');

    if (booking.status === 'confirmed' || booking.status === 'delivered') {
      throw new Error('Booking is already paid');
    }
    // Ownership/idempotency guard: only allow checkout creation for fresh,
    // unpaid bookings. Prevents an attacker who guesses a booking UUID from
    // overwriting an in-progress legitimate Stripe session or mutating
    // package/amount fields on an existing booking.
    if (booking.status !== 'pending' || booking.stripe_session_id) {
      throw new Error('Checkout already started for this booking. Please use the original payment link or contact support.');
    }

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [pkg.id], limit: 1 });
    if (!prices.data.length) throw new Error('Price not configured in Stripe');
    const stripePrice = prices.data[0];

    // Booking contact email is not a billing ownership credential, even for admin-assisted bookings.
    const { resolveBillingCustomer } = await import('@/lib/billing-ownership.server');
    const customerId = await resolveBillingCustomer(stripe, context, data.environment);

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: 'payment',
      ui_mode: 'embedded_page',
      return_url: data.returnUrl,
      customer: customerId,
      metadata: {
        bookingTable: pkg.table,
        bookingId: booking.id,
        packageId: pkg.id,
      },
      payment_intent_data: {
        metadata: {
          bookingTable: pkg.table,
          bookingId: booking.id,
          packageId: pkg.id,
        },
      },
    });

    await supabase
      .from(pkg.table)
      .update({
        status: 'awaiting_payment',
        package_id: pkg.id,
        amount_cents: pkg.amountCents,
        stripe_session_id: session.id,
      })
      .eq('id', booking.id);

    return session.client_secret as string;
  });

export const getBookingByStripeSession = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string }) => {
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(data.sessionId)) throw new Error('Invalid session id');
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError) return null;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const supabase = supabaseAdmin;
    for (const table of ['studio_bookings', 'block_bookings'] as const) {
      let query = supabase
        .from(table)
        .select('id, full_name, email, status, package_id, amount_cents, amount_paid_cents, paid_at')
        .eq('stripe_session_id', data.sessionId);
      if (!isAdmin) query = query.eq('user_id', context.userId);
      const { data: row } = await query.maybeSingle();
      if (row) {
        return { table, booking: row };
      }
    }
    return null;
  });