// Server-only helper. Extracted from the Stripe webhook so the idempotency
// logic can be unit-tested without spinning up Stripe + Supabase.
//
// All side effects (suppression lookup, log claim, enqueue, rollback) go
// through the injected supabase client so tests can pass a fake.
import * as React from 'react';
import { render } from '@react-email/components';
import { TEMPLATES } from '@/lib/email-templates/registry';

const SENDER_DOMAIN = 'notify.bwfmedia.company';
const FROM_ADDRESS = `BWF Media <checkout@${SENDER_DOMAIN}>`;

export type CancellationOutcome =
  | 'sent'
  | 'duplicate'
  | 'suppressed'
  | 'no_email'
  | 'enqueue_failed'
  | 'claim_failed';

export interface SupabaseLike {
  from: (table: string) => any;
  rpc: (name: string, args: any) => Promise<{ error: any }>;
}

export async function sendStripeCancellationEmail(
  supabase: SupabaseLike,
  email: string | null | undefined,
  refId: string,
): Promise<CancellationOutcome> {
  if (!email || !refId) return 'no_email';
  const normalizedEmail = email.toLowerCase();
  const messageId = `stripe-cancel-${refId}`;

  // 1) Suppression check — never claim a log row for a suppressed recipient.
  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (suppressed) return 'suppressed';

  // 2) Race-safe idempotency claim. The partial unique indexes
  //    (status='pending' and status='sent') guarantee only one concurrent
  //    insert wins; the rest get 23505 and exit as duplicates.
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
    if ((claimError as any).code === '23505') return 'duplicate';
    console.error('Webhook: failed to claim cancellation email log row', claimError);
    return 'claim_failed';
  }

  // 3) Render + enqueue.
  const entry = TEMPLATES['checkout-cancellation'];
  const templateData = {};
  const html = await render(React.createElement(entry.component, templateData));
  const text = await render(React.createElement(entry.component, templateData), { plainText: true });
  const subject = typeof entry.subject === 'function' ? entry.subject(templateData) : entry.subject;

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
    // Roll the pending claim back so a future Stripe retry can try again
    // instead of being silently suppressed by the pending-row guard.
    await supabase
      .from('email_send_log')
      .delete()
      .eq('message_id', messageId)
      .eq('status', 'pending');
    return 'enqueue_failed';
  }
  return 'sent';
}