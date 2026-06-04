import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import * as React from 'react';
import { render } from '@react-email/components';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';
import { TEMPLATES } from '@/lib/email-templates/registry';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

const SENDER_DOMAIN = 'notify.bwfmedia.company';
const FROM_ADDRESS = `BWF Media <checkout@${SENDER_DOMAIN}>`;

// Triggered by Stripe webhook events ONLY (checkout.session.expired,
// payment_intent.payment_failed). The signature has already been verified
// upstream — never expose this side-effect to client callers.
async function sendStripeCancellationEmail(email: string | null | undefined, refId: string) {
  if (!email || !refId) return;
  const normalizedEmail = email.toLowerCase();
  const supabase = getSupabase();
  const messageId = `stripe-cancel-${refId}`;

  // Honor suppression list.
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (suppressed) return;

  // Race-safe idempotency claim: insert the log row BEFORE enqueueing.
  // A partial unique index on (message_id) WHERE status='pending' plus the
  // existing unique index WHERE status='sent' guarantees that concurrent
  // Stripe webhook retries collide here — only one insert wins, the rest
  // hit a unique-violation and exit without enqueueing a second email.
  const { error: claimError } = await supabase
    .from('email_send_log')
    .insert({
      message_id: messageId,
      template_name: 'checkout-cancellation',
      recipient_email: email,
      status: 'pending',
      metadata: { source: 'stripe_webhook', ref: refId },
    });
  if (claimError) {
    // 23505 = unique_violation → duplicate webhook delivery, already handled.
    if ((claimError as any).code === '23505') return;
    console.error('Webhook: failed to claim cancellation email log row', claimError);
    return;
  }

  const entry = TEMPLATES['checkout-cancellation'];
  const templateData = {};
  const html = await render(React.createElement(entry.component, templateData));
  const text = await render(React.createElement(entry.component, templateData), { plainText: true });
  const subject = typeof entry.subject === 'function' ? entry.subject(templateData) : entry.subject;

  // One unsubscribe token per recipient.
  let unsubscribeToken: string | null = null;
  const { data: existingTok } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (existingTok?.token) {
    unsubscribeToken = existingTok.token;
  } else {
    const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const { error: tokErr } = await supabase
      .from('email_unsubscribe_tokens')
      .insert({ email: normalizedEmail, token: newToken });
    if (!tokErr) unsubscribeToken = newToken;
  }

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      to: email,
      from: FROM_ADDRESS,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'checkout-cancellation',
      idempotency_key: messageId,
      unsubscribe_token: unsubscribeToken,
      message_id: messageId,
      queued_at: new Date().toISOString(),
    },
  });
  if (enqueueError) {
    console.error('Webhook: failed to enqueue cancellation email', enqueueError);
    // Roll the claim back so a future Stripe retry can try again instead
    // of being silently suppressed by the pending-row idempotency guard.
    await supabase
      .from('email_send_log')
      .delete()
      .eq('message_id', messageId)
      .eq('status', 'pending');
    return;
  }
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

function routeSessionPaid(session: any) {
  const meta = session.metadata || {};
  if (meta.kind === 'tip') return recordTip(session);
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
            case 'checkout.session.expired': {
              const s: any = event.data.object;
              await sendStripeCancellationEmail(s.customer_email ?? s.customer_details?.email, s.id);
              break;
            }
            case 'payment_intent.payment_failed': {
              const intent: any = event.data.object;
              await sendStripeCancellationEmail(intent.receipt_email ?? intent.charges?.data?.[0]?.billing_details?.email, intent.id);
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