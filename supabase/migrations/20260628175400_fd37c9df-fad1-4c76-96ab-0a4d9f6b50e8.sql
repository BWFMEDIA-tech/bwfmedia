
ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'stream';

ALTER TABLE public.tips ALTER COLUMN stream_id DROP NOT NULL;

ALTER TABLE public.tips
  DROP CONSTRAINT IF EXISTS tips_target_check;
ALTER TABLE public.tips
  ADD CONSTRAINT tips_target_check
  CHECK (stream_id IS NOT NULL OR artist_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tips_artist ON public.tips(artist_id, paid_at DESC);

-- Credit a direct artist tip to that artist's current-month royalty bucket.
-- 90% to the artist, 10% platform fee. Marks status='approved' so the
-- artist can withdraw immediately via the existing payout flow.
CREATE OR REPLACE FUNCTION public.credit_artist_tip(
  _artist_id uuid,
  _amount_cents bigint,
  _source_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m date := public.month_bucket(now());
  artist_cut bigint;
BEGIN
  IF _artist_id IS NULL OR _amount_cents IS NULL OR _amount_cents <= 0 THEN
    RETURN;
  END IF;
  artist_cut := floor(_amount_cents * 0.90)::bigint;

  INSERT INTO public.artist_royalties(
    artist_id, month, weighted_streams, raw_streams,
    share_pct, artist_pool_cents, payout_amount_cents, status, metadata
  )
  VALUES (
    _artist_id, m, 0, 0,
    0, artist_cut, artist_cut, 'approved',
    jsonb_build_object('tip_sources', jsonb_build_array(_source_id), 'tips_cents', artist_cut)
  )
  ON CONFLICT (artist_id, month) DO UPDATE
    SET payout_amount_cents = public.artist_royalties.payout_amount_cents + EXCLUDED.payout_amount_cents,
        artist_pool_cents   = public.artist_royalties.artist_pool_cents   + EXCLUDED.artist_pool_cents,
        status = CASE
          WHEN public.artist_royalties.status = 'paid' THEN 'approved'
          ELSE public.artist_royalties.status
        END,
        metadata = COALESCE(public.artist_royalties.metadata,'{}'::jsonb)
          || jsonb_build_object(
            'tips_cents',
            COALESCE((public.artist_royalties.metadata->>'tips_cents')::bigint, 0) + artist_cut
          ),
        updated_at = now();
END $$;

REVOKE ALL ON FUNCTION public.credit_artist_tip(uuid, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_artist_tip(uuid, bigint, text) TO service_role;
