
-- =========================================================
-- PHASE 3.3 — ROYALTY CALCULATION ENGINE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.artist_royalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  month date NOT NULL,
  weighted_streams numeric(14,2) NOT NULL DEFAULT 0,
  raw_streams bigint NOT NULL DEFAULT 0,
  share_pct numeric(7,4) NOT NULL DEFAULT 0,
  artist_pool_cents bigint NOT NULL DEFAULT 0,
  payout_amount_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','void')),
  paid_at timestamptz,
  payout_request_id uuid REFERENCES public.payout_requests(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, month)
);

GRANT SELECT ON public.artist_royalties TO authenticated;
GRANT ALL ON public.artist_royalties TO service_role;

ALTER TABLE public.artist_royalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists view own royalties"
  ON public.artist_royalties FOR SELECT
  TO authenticated
  USING (auth.uid() = artist_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_artist_royalties_month ON public.artist_royalties(month);
CREATE INDEX IF NOT EXISTS idx_artist_royalties_artist ON public.artist_royalties(artist_id);

DROP TRIGGER IF EXISTS trg_artist_royalties_touch ON public.artist_royalties;
CREATE TRIGGER trg_artist_royalties_touch
  BEFORE UPDATE ON public.artist_royalties
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Calculate royalties for a given month based on weighted streams.
CREATE OR REPLACE FUNCTION public.calculate_artist_royalties(_month date DEFAULT NULL)
RETURNS TABLE(artists_paid int, total_payout_cents bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  m date := COALESCE(_month, public.month_bucket(now()));
  pool public.revenue_pools%ROWTYPE;
  total_weighted numeric(14,2);
  artist_pool bigint;
BEGIN
  -- Ensure pool is computed
  SELECT * INTO pool FROM public.calculate_monthly_revenue_pool(m);
  artist_pool := COALESCE(pool.artist_pool_cents, 0);

  SELECT COALESCE(SUM(weighted_value), 0) INTO total_weighted
    FROM public.stream_events
   WHERE artist_id IS NOT NULL
     AND valid_stream = true
     AND public.month_bucket(created_at) = m;

  IF total_weighted <= 0 OR artist_pool <= 0 THEN
    -- nothing to allocate
    RETURN QUERY SELECT 0, 0::bigint;
    RETURN;
  END IF;

  WITH per_artist AS (
    SELECT artist_id,
           SUM(weighted_value)::numeric(14,2) AS wstreams,
           COUNT(*)::bigint AS raw
      FROM public.stream_events
     WHERE artist_id IS NOT NULL
       AND valid_stream = true
       AND public.month_bucket(created_at) = m
     GROUP BY artist_id
  ),
  upserted AS (
    INSERT INTO public.artist_royalties(
      artist_id, month, weighted_streams, raw_streams,
      share_pct, artist_pool_cents, payout_amount_cents, status
    )
    SELECT a.artist_id,
           m,
           a.wstreams,
           a.raw,
           ROUND((a.wstreams / total_weighted) * 100, 4),
           artist_pool,
           FLOOR((a.wstreams / total_weighted) * artist_pool)::bigint,
           'pending'
      FROM per_artist a
    ON CONFLICT (artist_id, month) DO UPDATE SET
      weighted_streams    = EXCLUDED.weighted_streams,
      raw_streams         = EXCLUDED.raw_streams,
      share_pct           = EXCLUDED.share_pct,
      artist_pool_cents   = EXCLUDED.artist_pool_cents,
      payout_amount_cents = CASE
        WHEN artist_royalties.status = 'paid' THEN artist_royalties.payout_amount_cents
        ELSE EXCLUDED.payout_amount_cents
      END,
      updated_at = now()
    RETURNING payout_amount_cents
  )
  SELECT COUNT(*)::int, COALESCE(SUM(payout_amount_cents),0)::bigint
    INTO artists_paid, total_payout_cents
    FROM upserted;

  RETURN QUERY SELECT artists_paid, total_payout_cents;
END $$;

REVOKE ALL ON FUNCTION public.calculate_artist_royalties(date) FROM public;
GRANT EXECUTE ON FUNCTION public.calculate_artist_royalties(date) TO service_role;

-- =========================================================
-- PHASE 3.4 — STRIPE CONNECT auto-payout flag
-- =========================================================

ALTER TABLE public.payout_accounts
  ADD COLUMN IF NOT EXISTS auto_payout_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_payout_cents integer NOT NULL DEFAULT 1000;

-- Earnings summary RPC (for dashboard "available to withdraw")
CREATE OR REPLACE FUNCTION public.get_artist_earnings_summary(_artist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  approved_cents bigint;
  pending_cents bigint;
  paid_cents bigint;
  requested_cents bigint;
  weighted_total numeric(14,2);
  raw_total bigint;
  current_m date := public.month_bucket(now());
  this_month_estimate bigint;
BEGIN
  IF _artist_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT
    COALESCE(SUM(payout_amount_cents) FILTER (WHERE status='approved'),0),
    COALESCE(SUM(payout_amount_cents) FILTER (WHERE status='pending'),0),
    COALESCE(SUM(payout_amount_cents) FILTER (WHERE status='paid'),0)
  INTO approved_cents, pending_cents, paid_cents
  FROM public.artist_royalties WHERE artist_id = _artist_id;

  SELECT COALESCE(SUM(amount_cents),0)
    INTO requested_cents
    FROM public.payout_requests
   WHERE user_id = _artist_id AND status IN ('queued','processing');

  SELECT COALESCE(SUM(weighted_value),0)::numeric(14,2), COUNT(*)
    INTO weighted_total, raw_total
    FROM public.stream_events
   WHERE artist_id = _artist_id AND valid_stream = true;

  -- Estimate current month earnings live (based on share of current month's weighted streams)
  SELECT COALESCE(payout_amount_cents,0) INTO this_month_estimate
    FROM public.artist_royalties
   WHERE artist_id = _artist_id AND month = current_m;

  RETURN jsonb_build_object(
    'lifetime_weighted_streams', weighted_total,
    'lifetime_raw_streams', raw_total,
    'pending_cents', pending_cents,
    'approved_cents', approved_cents,
    'paid_cents', paid_cents,
    'requested_cents', requested_cents,
    'available_cents', GREATEST(approved_cents - requested_cents, 0),
    'estimated_this_month_cents', COALESCE(this_month_estimate, 0)
  );
END $$;

REVOKE ALL ON FUNCTION public.get_artist_earnings_summary(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_artist_earnings_summary(uuid) TO authenticated, service_role;

-- =========================================================
-- PHASE 3.5 — Upgrade artist dashboard RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_my_artist_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  sub_row public.subscriptions%ROWTYPE;
  pa_row public.payout_accounts%ROWTYPE;
  summary jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;

  SELECT * INTO sub_row FROM public.subscriptions
   WHERE user_id = uid ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO pa_row FROM public.payout_accounts
   WHERE user_id = uid ORDER BY created_at DESC LIMIT 1;

  summary := public.get_artist_earnings_summary(uid);

  RETURN jsonb_build_object(
    'subscription', CASE WHEN sub_row.id IS NULL THEN NULL ELSE jsonb_build_object(
      'status', sub_row.status,
      'role', sub_row.role,
      'price_id', sub_row.price_id,
      'current_period_end', sub_row.current_period_end,
      'cancel_at_period_end', sub_row.cancel_at_period_end
    ) END,
    'earnings', summary,
    'earnings_cents', COALESCE((summary->>'available_cents')::bigint, 0),
    'payout_account', CASE WHEN pa_row.id IS NULL THEN NULL ELSE jsonb_build_object(
      'stripe_account_id', pa_row.stripe_account_id,
      'charges_enabled', pa_row.charges_enabled,
      'payouts_enabled', pa_row.payouts_enabled,
      'details_submitted', pa_row.details_submitted,
      'country', pa_row.country,
      'auto_payout_enabled', pa_row.auto_payout_enabled,
      'minimum_payout_cents', pa_row.minimum_payout_cents
    ) END,
    'payout_ready', COALESCE(pa_row.payouts_enabled, false)
                    AND COALESCE((summary->>'available_cents')::bigint,0) >= COALESCE(pa_row.minimum_payout_cents, 1000)
  );
END $$;
