import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
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

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: booking, error } = await supabase
      .from(pkg.table)
      .select('id, email, full_name, status, stripe_session_id')
      .eq('id', data.bookingId)
      .maybeSingle();
    if (error || !booking) throw new Error('Booking not found');

    // Ownership: the booking's email must match the authenticated user, OR
    // the caller must be an admin. Prevents a stranger who guesses/learns a
    // booking UUID from initiating checkout and locking out the real payer.
    const { data: userRow } = await context.supabase.auth.getUser();
    const callerEmail = userRow.user?.email?.toLowerCase() ?? null;
    const callerId = userRow.user?.id ?? null;
    const { data: adminRow } = callerId
      ? await supabase.from('user_roles').select('role').eq('user_id', callerId).eq('role', 'admin').maybeSingle()
      : { data: null };
    const isAdmin = !!adminRow;
    if (!isAdmin && (!callerEmail || !booking.email || booking.email.toLowerCase() !== callerEmail)) {
      throw new Error('Not authorized for this booking');
    }

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

    // Find or create a Customer keyed on email so repeat bookers don't duplicate.
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email: booking.email, limit: 1 });
    if (existing.data.length) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email: booking.email,
        name: booking.full_name,
        metadata: { bookingTable: pkg.table, bookingId: booking.id },
      });
      customerId = created.id;
    }

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
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: userRow } = await context.supabase.auth.getUser();
    const userEmail = userRow.user?.email?.toLowerCase() ?? null;
    const userId = userRow.user?.id ?? null;
    const { data: adminRow } = userId
      ? await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
      : { data: null };
    const isAdmin = !!adminRow;
    for (const table of ['studio_bookings', 'block_bookings'] as const) {
      const { data: row } = await supabase
        .from(table)
        .select('id, full_name, email, status, package_id, amount_cents, amount_paid_cents, paid_at')
        .eq('stripe_session_id', data.sessionId)
        .maybeSingle();
      if (row) {
        const owns = isAdmin || (userEmail && row.email && row.email.toLowerCase() === userEmail);
        if (!owns) {
          // Return only non-PII status info
          return {
            table,
            booking: {
              id: row.id,
              status: row.status,
              package_id: row.package_id,
              amount_cents: row.amount_cents,
              amount_paid_cents: row.amount_paid_cents,
              paid_at: row.paid_at,
            },
          };
        }
        return { table, booking: row };
      }
    }
    return null;
  });