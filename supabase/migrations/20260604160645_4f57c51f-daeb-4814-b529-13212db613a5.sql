-- Race-safe idempotency claim for cancellation emails: prevent duplicate
-- pending rows for the same message_id so a concurrent webhook delivery
-- can't both pass the "prior row" check and double-enqueue.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_pending_unique
  ON public.email_send_log (message_id)
  WHERE status = 'pending';