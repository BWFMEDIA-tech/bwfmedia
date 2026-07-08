-- One in-flight payout request per user. Two rapid requestPayout calls both
-- read the same available balance and could queue two transfers for it; the
-- partial unique index makes the second insert fail (mapped to a friendly
-- "payout already in progress" message in payouts.functions.ts).
CREATE UNIQUE INDEX IF NOT EXISTS payout_requests_one_inflight_per_user
  ON public.payout_requests (user_id)
  WHERE status IN ('queued', 'processing');
