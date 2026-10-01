// Server-only helper used by the Stripe webhook to send the cancellation email.
// Idempotency: the managed send dedupes on the stable idempotency key, and a
// prior 'sent' log row short-circuits Stripe retries.
import { sendAndLog, type LogClient } from '@/lib/email-send-log';

export type CancellationOutcome = 'sent' | 'duplicate' | 'suppressed' | 'no_email' | 'send_failed';

export type SupabaseLike = LogClient;

export async function sendStripeCancellationEmail(
  supabase: SupabaseLike,
  email: string | null | undefined,
  refId: string,
): Promise<CancellationOutcome> {
  if (!email || !refId) return 'no_email';
  const messageId = `stripe-cancel-${refId}`;

  const { data: prior } = await supabase
    .from('email_send_log')
    .select('id')
    .eq('message_id', messageId)
    .eq('status', 'sent')
    .limit(1)
    .maybeSingle();
  if (prior) return 'duplicate';

  const outcome = await sendAndLog(supabase, {
    templateName: 'checkout-cancellation',
    to: email,
    templateData: {},
    idempotencyKey: messageId,
    metadata: { source: 'stripe_webhook', ref: refId },
  });
  return outcome === 'failed' ? 'send_failed' : outcome;
}
