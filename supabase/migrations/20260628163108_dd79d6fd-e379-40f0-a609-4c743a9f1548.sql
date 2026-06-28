
-- ===== revenue_pools (monthly snapshot) =====
CREATE TABLE IF NOT EXISTS public.revenue_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE, -- first day of the month (UTC)
  total_revenue_cents bigint NOT NULL DEFAULT 0,
  listener_revenue_cents bigint NOT NULL DEFAULT 0,
  artist_revenue_cents bigint NOT NULL DEFAULT 0,
  ads_revenue_cents bigint NOT NULL DEFAULT 0,
  tips_revenue_cents bigint NOT NULL DEFAULT 0,
  artist_pool_cents bigint NOT NULL DEFAULT 0,
  platform_pool_cents bigint NOT NULL DEFAULT 0,
  incentive_pool_cents bigint NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.revenue_pools TO authenticated;
GRANT ALL ON public.revenue_pools TO service_role;

ALTER TABLE public.revenue_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view revenue pools"
  ON public.revenue_pools FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages revenue pools"
  ON public.revenue_pools FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_revenue_pools_updated_at
  BEFORE UPDATE ON public.revenue_pools
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== revenue_pool_entries (line items) =====
CREATE TABLE IF NOT EXISTS public.revenue_pool_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  source text NOT NULL CHECK (source IN ('listener_subscription','artist_subscription','ads','tips','boost','other')),
  amount_cents bigint NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_type text,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, reference_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_revenue_pool_entries_month ON public.revenue_pool_entries(month);
CREATE INDEX IF NOT EXISTS idx_revenue_pool_entries_source ON public.revenue_pool_entries(source);

GRANT SELECT ON public.revenue_pool_entries TO authenticated;
GRANT ALL ON public.revenue_pool_entries TO service_role;

ALTER TABLE public.revenue_pool_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view pool entries"
  ON public.revenue_pool_entries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages pool entries"
  ON public.revenue_pool_entries FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ===== Helper: month bucket =====
CREATE OR REPLACE FUNCTION public.month_bucket(_ts timestamptz)
RETURNS date
LANGUAGE sql IMMUTABLE
AS $$ SELECT date_trunc('month', _ts AT TIME ZONE 'UTC')::date $$;

-- ===== record_revenue_event =====
CREATE OR REPLACE FUNCTION public.record_revenue_event(
  _source text,
  _amount_cents bigint,
  _occurred_at timestamptz DEFAULT now(),
  _user_id uuid DEFAULT NULL,
  _reference_type text DEFAULT NULL,
  _reference_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid; m date;
BEGIN
  IF _amount_cents IS NULL OR _amount_cents <= 0 THEN RETURN NULL; END IF;
  m := public.month_bucket(COALESCE(_occurred_at, now()));
  INSERT INTO public.revenue_pool_entries(month, source, amount_cents, user_id, reference_type, reference_id, metadata)
  VALUES (m, _source, _amount_cents, _user_id, _reference_type, _reference_id, COALESCE(_metadata,'{}'::jsonb))
  ON CONFLICT (source, reference_type, reference_id) DO NOTHING
  RETURNING id INTO new_id;

  IF new_id IS NOT NULL THEN
    PERFORM public.calculate_monthly_revenue_pool(m);
  END IF;
  RETURN new_id;
END $$;

-- ===== get_total_revenue =====
CREATE OR REPLACE FUNCTION public.get_total_revenue(_month date DEFAULT NULL)
RETURNS TABLE(
  month date,
  total_cents bigint,
  listener_cents bigint,
  artist_cents bigint,
  ads_cents bigint,
  tips_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(_month, public.month_bucket(now())) AS month,
    COALESCE(SUM(amount_cents),0)::bigint AS total_cents,
    COALESCE(SUM(amount_cents) FILTER (WHERE source='listener_subscription'),0)::bigint AS listener_cents,
    COALESCE(SUM(amount_cents) FILTER (WHERE source='artist_subscription'),0)::bigint AS artist_cents,
    COALESCE(SUM(amount_cents) FILTER (WHERE source='ads'),0)::bigint AS ads_cents,
    COALESCE(SUM(amount_cents) FILTER (WHERE source IN ('tips','boost')),0)::bigint AS tips_cents
  FROM public.revenue_pool_entries
  WHERE month = COALESCE(_month, public.month_bucket(now()))
$$;

-- ===== split_revenue_pool =====
CREATE OR REPLACE FUNCTION public.split_revenue_pool(_total_cents bigint)
RETURNS TABLE(artist_pool_cents bigint, platform_pool_cents bigint, incentive_pool_cents bigint)
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    (COALESCE(_total_cents,0) * 75 / 100)::bigint,
    (COALESCE(_total_cents,0) * 20 / 100)::bigint,
    (COALESCE(_total_cents,0) -
       (COALESCE(_total_cents,0) * 75 / 100) -
       (COALESCE(_total_cents,0) * 20 / 100))::bigint
$$;

-- ===== calculate_monthly_revenue_pool =====
CREATE OR REPLACE FUNCTION public.calculate_monthly_revenue_pool(_month date DEFAULT NULL)
RETURNS public.revenue_pools
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m date := COALESCE(_month, public.month_bucket(now()));
  t record;
  s record;
  row_out public.revenue_pools;
BEGIN
  SELECT * INTO t FROM public.get_total_revenue(m);
  SELECT * INTO s FROM public.split_revenue_pool(t.total_cents);

  INSERT INTO public.revenue_pools(
    month, total_revenue_cents, listener_revenue_cents, artist_revenue_cents,
    ads_revenue_cents, tips_revenue_cents,
    artist_pool_cents, platform_pool_cents, incentive_pool_cents, computed_at
  ) VALUES (
    m, t.total_cents, t.listener_cents, t.artist_cents, t.ads_cents, t.tips_cents,
    s.artist_pool_cents, s.platform_pool_cents, s.incentive_pool_cents, now()
  )
  ON CONFLICT (month) DO UPDATE SET
    total_revenue_cents = EXCLUDED.total_revenue_cents,
    listener_revenue_cents = EXCLUDED.listener_revenue_cents,
    artist_revenue_cents = EXCLUDED.artist_revenue_cents,
    ads_revenue_cents = EXCLUDED.ads_revenue_cents,
    tips_revenue_cents = EXCLUDED.tips_revenue_cents,
    artist_pool_cents = EXCLUDED.artist_pool_cents,
    platform_pool_cents = EXCLUDED.platform_pool_cents,
    incentive_pool_cents = EXCLUDED.incentive_pool_cents,
    computed_at = now(),
    updated_at = now()
  RETURNING * INTO row_out;

  RETURN row_out;
END $$;
