import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

async function markBookingPaid(session: any) {
  const meta = session.metadata || {};
  const table = meta.bookingTable as 'studio_bookings' | 'block_bookings' | undefined;
  const bookingId = meta.bookingId as string | undefined;
  if (!table || !bookingId) {
    console.warn('Webhook: missing bookingTable/bookingId metadata', session.id);
    return;
  }
  if (table !== 'studio_bookings' && table !== 'block_bookings') {
    console.warn('Webhook: invalid bookingTable', table);
    return;
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from(table)
    .update({
      status: 'confirmed',
      stripe_payment_intent_id: session.payment_intent ?? null,
      amount_paid_cents: session.amount_total ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  if (error) console.error('Webhook: failed to mark booking paid', error);
}

async function markLiveSubmissionPaid(session: any) {
  const meta = session.metadata || {};
  const submissionId = meta.submissionId as string | undefined;
  if (!submissionId) return;
  const supabase = getSupabase();
  const { error } = await supabase
    .from('live_submissions')
    .update({
      status: 'paid',
      stripe_payment_intent_id: session.payment_intent ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq('id', submissionId);
  if (error) console.error('Webhook: failed to mark live submission paid', error);
}

function routeSessionPaid(session: any) {
  const meta = session.metadata || {};
  if (meta.submissionType === 'live_review') return markLiveSubmissionPaid(session);
  if (meta.bookingTable) return markBookingPaid(session);
  console.warn('Webhook: session has no recognized metadata', session.id);
  return Promise.resolve();
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('Webhook received with invalid env:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded':
              await routeSessionPaid(event.data.object);
              break;
            default:
              console.log('Unhandled Stripe event', event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});