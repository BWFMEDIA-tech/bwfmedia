import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';
import { sendStripeCancellationEmail } from '@/lib/cancellation-email';

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

async function recordTip(session: any) {
  const meta = session.metadata || {};
  const streamId = meta.streamId as string | undefined;
  if (!streamId) {
    console.warn('Tip webhook missing streamId metadata', session.id);
    return;
  }
  const userId = (meta.tipUserId as string) || null;
  const displayName = (meta.tipDisplayName as string) || 'Anonymous';
  const message = (meta.tipMessage as string) || '';
  const amount = session.amount_total ?? 0;
  const supabase = getSupabase();

  const { data: tipRow, error: tipErr } = await supabase
    .from('tips')
    .upsert({
      stream_id: streamId,
      user_id: userId,
      display_name: displayName,
      amount_cents: amount,
      message,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent ?? null,
      status: 'paid',
      paid_at: new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' })
    .select('id')
    .maybeSingle();
  if (tipErr) {
    console.error('Tip insert failed', tipErr);
    return;
  }

  // Post a system super-chat message in the stream chat so viewers see it.
  if (userId) {
    const dollars = (amount / 100).toFixed(2);
    const body = `💎 TIP $${dollars}${message ? ` — ${message}` : ''}`;
    await supabase.from('stream_messages').insert({
      stream_id: streamId,
      user_id: userId,
      body,
    });
  }
}

async function grantPlayBoost(session: any) {
  const meta = session.metadata || {};
  const userId = meta.userId as string | undefined;
  const credits = parseInt((meta.credits as string) || '2', 10);
  if (!userId) { console.warn('play_boost webhook missing userId', session.id); return; }
  const supabase = getSupabase();
  const { error } = await supabase.rpc('grant_play_boost_credits', {
    _user_id: userId, _credits: Number.isFinite(credits) ? credits : 2,
  });
  if (error) console.error('grant_play_boost_credits failed', error);
}

async function upsertPlayMembershipFromSubscription(sub: any) {
  const userId = sub?.metadata?.userId as string | undefined;
  if (!userId) { console.warn('play_membership sub missing userId', sub?.id); return; }
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : (sub.items?.data?.[0]?.current_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
        : null);
  const supabase = getSupabase();
  const { error } = await supabase.from('play_memberships').upsert({
    user_id: userId,
    status: sub.status ?? 'inactive',
    stripe_customer_id: sub.customer ?? null,
    stripe_subscription_id: sub.id ?? null,
    current_period_end: periodEnd,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) console.error('play_memberships upsert failed', error);
}

async function upsertArtistSubscription(sub: any, env: StripeEnv) {
  const userId = sub?.metadata?.userId as string | undefined;
  if (!userId) {
    console.warn('artist_membership sub missing userId', sub?.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = typeof item?.price?.product === 'string'
    ? item.price.product
    : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const trialEnd = sub.trial_end ?? null;
  const supabase = getSupabase();
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    product_id: productId ?? 'artist_membership',
    price_id: priceId ?? 'artist_monthly',
    status: sub.status ?? 'active',
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });
  if (error) console.error('artist subscriptions upsert failed', error);
}

async function markArtistSubscriptionDeleted(sub: any, env: StripeEnv) {
  const supabase = getSupabase();
  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id)
    .eq('environment', env);
  if (error) console.error('artist subscriptions cancel failed', error);
}

function routeSessionPaid(session: any) {
  const meta = session.metadata || {};
  if (meta.kind === 'tip') return recordTip(session);
  if (meta.kind === 'play_boost') return grantPlayBoost(session);
  if (meta.kind === 'play_membership') return Promise.resolve(); // handled via subscription events
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
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
              const sub: any = event.data.object;
              if (sub?.metadata?.kind === 'play_membership') {
                await upsertPlayMembershipFromSubscription(sub);
              } else if (sub?.metadata?.kind === 'artist_membership') {
                if (event.type === 'customer.subscription.deleted') {
                  await markArtistSubscriptionDeleted(sub, env);
                } else {
                  await upsertArtistSubscription(sub, env);
                }
              }
              break;
            }
            case 'checkout.session.expired': {
              const s: any = event.data.object;
              await sendStripeCancellationEmail(getSupabase(), s.customer_email ?? s.customer_details?.email, s.id);
              break;
            }
            case 'payment_intent.payment_failed': {
              const intent: any = event.data.object;
              await sendStripeCancellationEmail(getSupabase(), intent.receipt_email ?? intent.charges?.data?.[0]?.billing_details?.email, intent.id);
              break;
            }
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