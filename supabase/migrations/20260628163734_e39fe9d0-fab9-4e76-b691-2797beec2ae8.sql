
-- 1. stream_events: prepares infra for future royalty engine
CREATE TABLE IF NOT EXISTS public.stream_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  track_id uuid NOT NULL REFERENCES public.play_tracks(id) ON DELETE CASCADE,
  artist_id uuid,
  duration_played_seconds integer NOT NULL DEFAULT 0,
  valid_stream boolean NOT NULL DEFAULT false,
  stream_environment text NOT NULL DEFAULT 'live',
  client_session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stream_events_track ON public.stream_events(track_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_events_artist ON public.stream_events(artist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_events_user ON public.stream_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_events_valid ON public.stream_events(valid_stream, created_at DESC) WHERE valid_stream;

GRANT SELECT, INSERT ON public.stream_events TO authenticated;
GRANT ALL ON public.stream_events TO service_role;

ALTER TABLE public.stream_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own stream events"
  ON public.stream_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read their own stream events"
  ON public.stream_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Artists read stream events for their tracks"
  ON public.stream_events FOR SELECT TO authenticated
  USING (artist_id = auth.uid());

CREATE POLICY "Admins read all stream events"
  ON public.stream_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-populate artist_id and valid_stream
CREATE OR REPLACE FUNCTION public.stream_events_enrich()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.artist_id IS NULL THEN
    SELECT artist_user_id INTO NEW.artist_id FROM public.play_tracks WHERE id = NEW.track_id;
  END IF;
  NEW.valid_stream := COALESCE(NEW.duration_played_seconds, 0) >= 30;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stream_events_enrich ON public.stream_events;
CREATE TRIGGER trg_stream_events_enrich
BEFORE INSERT ON public.stream_events
FOR EACH ROW EXECUTE FUNCTION public.stream_events_enrich();

-- 2. Admin subscription metrics RPC
CREATE OR REPLACE FUNCTION public.get_admin_subscription_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  result jsonb;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO is_admin;
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  WITH active_subs AS (
    SELECT *
      FROM public.subscriptions
     WHERE (
       status IN ('trialing','active','past_due')
       AND (current_period_end IS NULL OR current_period_end > now())
     )
  ),
  by_plan AS (
    SELECT
      price_id,
      COALESCE(role, 'unknown') AS role,
      COUNT(*)::int AS subscriber_count,
      COALESCE(SUM(price_cents), 0)::bigint AS mrr_cents
    FROM active_subs
    GROUP BY price_id, role
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*)::int FROM active_subs) AS active_subscribers,
      (SELECT COALESCE(SUM(price_cents),0)::bigint FROM active_subs) AS mrr_cents,
      (SELECT COUNT(*)::int FROM active_subs WHERE role = 'listener') AS listener_count,
      (SELECT COUNT(*)::int FROM active_subs WHERE role = 'artist') AS artist_count,
      (SELECT COALESCE(SUM(price_cents),0)::bigint FROM active_subs WHERE role = 'listener') AS listener_mrr_cents,
      (SELECT COALESCE(SUM(price_cents),0)::bigint FROM active_subs WHERE role = 'artist') AS artist_mrr_cents
  )
  SELECT jsonb_build_object(
    'active_subscribers', t.active_subscribers,
    'mrr_cents', t.mrr_cents,
    'listener_count', t.listener_count,
    'artist_count', t.artist_count,
    'listener_mrr_cents', t.listener_mrr_cents,
    'artist_mrr_cents', t.artist_mrr_cents,
    'by_plan', COALESCE((SELECT jsonb_agg(to_jsonb(by_plan)) FROM by_plan), '[]'::jsonb)
  ) INTO result
  FROM totals t;

  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.get_admin_subscription_metrics() TO authenticated;

-- 3. Artist dashboard placeholder summary
CREATE OR REPLACE FUNCTION public.get_my_artist_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  sub_row public.subscriptions%ROWTYPE;
  valid_streams bigint;
  total_streams bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;

  SELECT * INTO sub_row FROM public.subscriptions
   WHERE user_id = uid
   ORDER BY created_at DESC
   LIMIT 1;

  SELECT COUNT(*) FILTER (WHERE valid_stream), COUNT(*)
    INTO valid_streams, total_streams
  FROM public.stream_events
  WHERE artist_id = uid;

  RETURN jsonb_build_object(
    'subscription', CASE WHEN sub_row.id IS NULL THEN NULL ELSE jsonb_build_object(
      'status', sub_row.status,
      'role', sub_row.role,
      'price_id', sub_row.price_id,
      'current_period_end', sub_row.current_period_end,
      'cancel_at_period_end', sub_row.cancel_at_period_end
    ) END,
    'earnings_cents', 0,
    'payout_ready', false,
    'streams', jsonb_build_object(
      'total', COALESCE(total_streams,0),
      'valid', COALESCE(valid_streams,0)
    )
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_my_artist_dashboard() TO authenticated;
