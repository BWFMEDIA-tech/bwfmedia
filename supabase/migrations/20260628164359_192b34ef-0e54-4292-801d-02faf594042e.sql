
-- =========================================================
-- PHASE 3.1 — REVENUE LEDGER LOCK
-- =========================================================

CREATE TABLE IF NOT EXISTS public.revenue_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('subscription','ad','tip','boost','other')),
  source_id text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  month date NOT NULL,
  user_id uuid,
  processed boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

GRANT SELECT ON public.revenue_ledger TO authenticated;
GRANT ALL ON public.revenue_ledger TO service_role;

ALTER TABLE public.revenue_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view revenue ledger"
  ON public.revenue_ledger FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_revenue_ledger_month ON public.revenue_ledger(month);
CREATE INDEX IF NOT EXISTS idx_revenue_ledger_source ON public.revenue_ledger(source_type, source_id);

DROP TRIGGER IF EXISTS trg_revenue_ledger_touch ON public.revenue_ledger;
CREATE TRIGGER trg_revenue_ledger_touch
  BEFORE UPDATE ON public.revenue_ledger
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Idempotent recording function: every dollar exists EXACTLY ONCE.
CREATE OR REPLACE FUNCTION public.record_revenue_ledger(
  _source_type text,
  _source_id text,
  _amount_cents bigint,
  _occurred_at timestamptz DEFAULT now(),
  _user_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
  m date;
  pool_source text;
BEGIN
  IF _source_type IS NULL OR _source_id IS NULL THEN
    RAISE EXCEPTION 'source_type and source_id required';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN
    RETURN NULL;
  END IF;

  m := public.month_bucket(COALESCE(_occurred_at, now()));

  INSERT INTO public.revenue_ledger(source_type, source_id, amount_cents, month, user_id, metadata)
  VALUES (_source_type, _source_id, _amount_cents, m, _user_id, COALESCE(_metadata,'{}'::jsonb))
  ON CONFLICT (source_type, source_id) DO NOTHING
  RETURNING id INTO new_id;

  -- Only mirror into pool entries on first insert (LOCK enforced by unique key above).
  IF new_id IS NOT NULL THEN
    pool_source := CASE _source_type
      WHEN 'subscription' THEN COALESCE(_metadata->>'plan_role','listener') || '_subscription'
      WHEN 'ad'   THEN 'ads'
      WHEN 'tip'  THEN 'tips'
      WHEN 'boost' THEN 'boost'
      ELSE 'other'
    END;

    PERFORM public.record_revenue_event(
      pool_source,
      _amount_cents,
      _occurred_at,
      _user_id,
      _source_type,
      _source_id,
      _metadata
    );
  END IF;

  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.record_revenue_ledger(text,text,bigint,timestamptz,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_revenue_ledger(text,text,bigint,timestamptz,uuid,jsonb) TO service_role;

-- =========================================================
-- PHASE 3.2 — WEIGHTED STREAM ENGINE
-- =========================================================

ALTER TABLE public.stream_events
  ADD COLUMN IF NOT EXISTS user_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS user_multiplier numeric(4,2) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS engagement_score numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weighted_value numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_listen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

-- Replace enrich trigger fn to also compute weights.
CREATE OR REPLACE FUNCTION public.stream_events_enrich()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  eng numeric(5,2) := 0;
  mult numeric(4,2) := 0.5;
BEGIN
  IF NEW.artist_id IS NULL THEN
    SELECT artist_user_id INTO NEW.artist_id FROM public.play_tracks WHERE id = NEW.track_id;
  END IF;

  NEW.valid_stream := COALESCE(NEW.duration_played_seconds, 0) >= 30;

  -- Engagement scoring
  IF NEW.valid_stream THEN eng := eng + 1.0; END IF;
  IF NEW.full_listen     THEN eng := eng + 0.2; END IF;
  IF NEW.liked           THEN eng := eng + 0.3; END IF;
  IF NEW.saved           THEN eng := eng + 0.3; END IF;
  IF NEW.shared          THEN eng := eng + 0.5; END IF;
  NEW.engagement_score := eng;

  -- Tier multiplier
  mult := CASE lower(COALESCE(NEW.user_tier,'free'))
    WHEN 'premium'      THEN 1.0
    WHEN 'fan_premium'  THEN 1.3
    WHEN 'student'      THEN 0.9
    ELSE 0.5
  END;
  NEW.user_multiplier := mult;

  NEW.weighted_value := ROUND(mult * eng, 2);

  RETURN NEW;
END $$;

-- Trigger already exists from earlier migration; ensure it points at fn.
DROP TRIGGER IF EXISTS stream_events_enrich_trg ON public.stream_events;
CREATE TRIGGER stream_events_enrich_trg
  BEFORE INSERT OR UPDATE ON public.stream_events
  FOR EACH ROW EXECUTE FUNCTION public.stream_events_enrich();

CREATE INDEX IF NOT EXISTS idx_stream_events_artist_month
  ON public.stream_events(artist_id, created_at)
  WHERE valid_stream = true;
