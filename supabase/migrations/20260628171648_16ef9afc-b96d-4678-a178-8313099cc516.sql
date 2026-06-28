
-- 1. Columns on stream_events
ALTER TABLE public.stream_events
  ADD COLUMN IF NOT EXISTS anomaly_score numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anomaly_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_score numeric(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stream_events_suspicious
  ON public.stream_events (is_suspicious, created_at DESC) WHERE is_suspicious;

-- 2. Anomaly flag table
CREATE TABLE IF NOT EXISTS public.stream_anomaly_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_event_id uuid REFERENCES public.stream_events(id) ON DELETE CASCADE,
  user_id uuid,
  track_id uuid,
  artist_id uuid,
  anomaly_score numeric(5,2) NOT NULL DEFAULT 0,
  bot_score numeric(5,2) NOT NULL DEFAULT 0,
  reasons text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stream_anomaly_flags TO authenticated;
GRANT ALL ON public.stream_anomaly_flags TO service_role;

ALTER TABLE public.stream_anomaly_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read anomaly flags" ON public.stream_anomaly_flags;
CREATE POLICY "Admins read anomaly flags" ON public.stream_anomaly_flags
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_user ON public.stream_anomaly_flags(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_flags_track ON public.stream_anomaly_flags(track_id, created_at DESC);

-- 3. Detection function (runs in BEFORE INSERT trigger; extends existing enrich trigger)
CREATE OR REPLACE FUNCTION public.stream_events_detect_anomaly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reasons text[] := '{}';
  score numeric(5,2) := 0;
  bot numeric(5,2) := 0;
  recent_same_track int := 0;
  recent_total int := 0;
  distinct_tracks int := 0;
  recent_sessions int := 0;
  avg_gap numeric := 0;
  short_with_full int := 0;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- A. Rapid replays of same track in last 10 min (>3 = abuse)
  SELECT COUNT(*) INTO recent_same_track
    FROM public.stream_events
   WHERE user_id = NEW.user_id
     AND track_id = NEW.track_id
     AND created_at > now() - interval '10 minutes';
  IF recent_same_track >= 3 THEN
    reasons := array_append(reasons, 'rapid_replay');
    score := score + 30;
  END IF;

  -- B. Velocity: too many streams in last minute (>20/min impossible for human)
  SELECT COUNT(*), COUNT(DISTINCT track_id), COUNT(DISTINCT client_session_id)
    INTO recent_total, distinct_tracks, recent_sessions
    FROM public.stream_events
   WHERE user_id = NEW.user_id
     AND created_at > now() - interval '1 minute';
  IF recent_total >= 20 THEN
    reasons := array_append(reasons, 'impossible_velocity');
    score := score + 50; bot := bot + 50;
  ELSIF recent_total >= 10 THEN
    reasons := array_append(reasons, 'high_velocity');
    score := score + 20; bot := bot + 15;
  END IF;

  -- C. Multi-session spam (same user, many concurrent client sessions)
  IF recent_sessions >= 4 THEN
    reasons := array_append(reasons, 'multi_session');
    score := score + 25; bot := bot + 20;
  END IF;

  -- D. Weighted-stream abuse: full_listen=true but duration absurdly low
  IF NEW.full_listen AND NEW.duration_played_seconds < 30 THEN
    reasons := array_append(reasons, 'fake_full_listen');
    score := score + 40;
  END IF;

  -- E. Engagement stacking: liked+saved+shared on very short play
  IF NEW.duration_played_seconds < 15
     AND (NEW.liked OR NEW.saved OR NEW.shared) THEN
    reasons := array_append(reasons, 'engagement_stacking');
    score := score + 20;
  END IF;

  -- F. Tier mismatch: claims premium tier but multiplier doesn't match an active sub
  IF lower(COALESCE(NEW.user_tier,'free')) <> 'free'
     AND NOT public.has_active_tunevio_subscription(NEW.user_id, NULL) THEN
    reasons := array_append(reasons, 'tier_spoof');
    score := score + 35;
    NEW.user_tier := 'free';
    NEW.user_multiplier := 0.5;
  END IF;

  -- G. Bot pattern: uniform gaps between recent events (variance ~0)
  SELECT COUNT(*) INTO short_with_full
    FROM public.stream_events
   WHERE user_id = NEW.user_id
     AND created_at > now() - interval '15 minutes'
     AND duration_played_seconds BETWEEN 30 AND 35
     AND full_listen = true;
  IF short_with_full >= 8 THEN
    reasons := array_append(reasons, 'bot_uniform_play');
    bot := bot + 40; score := score + 25;
  END IF;

  NEW.anomaly_score := LEAST(score, 100);
  NEW.bot_score := LEAST(bot, 100);
  NEW.anomaly_reasons := reasons;
  NEW.is_suspicious := (NEW.anomaly_score >= 40 OR NEW.bot_score >= 40);

  -- Suspicious events do not earn royalties
  IF NEW.is_suspicious THEN
    NEW.valid_stream := false;
    NEW.weighted_value := 0;
  END IF;

  RETURN NEW;
END $$;

-- 4. Trigger AFTER enrich, BEFORE INSERT
DROP TRIGGER IF EXISTS trg_stream_events_detect_anomaly ON public.stream_events;
CREATE TRIGGER trg_stream_events_detect_anomaly
  BEFORE INSERT ON public.stream_events
  FOR EACH ROW EXECUTE FUNCTION public.stream_events_detect_anomaly();

-- Make sure enrich runs first by recreating it with an earlier-sorting name if needed
-- (Postgres fires BEFORE triggers in alphabetical name order; enrich existing name 'stream_events_enrich' should sort before 'trg_...')

-- 5. Log flag to anomaly table AFTER insert
CREATE OR REPLACE FUNCTION public.stream_events_log_anomaly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_suspicious THEN
    INSERT INTO public.stream_anomaly_flags(
      stream_event_id, user_id, track_id, artist_id,
      anomaly_score, bot_score, reasons, metadata
    ) VALUES (
      NEW.id, NEW.user_id, NEW.track_id, NEW.artist_id,
      NEW.anomaly_score, NEW.bot_score, NEW.anomaly_reasons,
      jsonb_build_object(
        'duration', NEW.duration_played_seconds,
        'tier', NEW.user_tier,
        'session', NEW.client_session_id
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stream_events_log_anomaly ON public.stream_events;
CREATE TRIGGER trg_stream_events_log_anomaly
  AFTER INSERT ON public.stream_events
  FOR EACH ROW EXECUTE FUNCTION public.stream_events_log_anomaly();

-- 6. Admin helper: anomaly summary
CREATE OR REPLACE FUNCTION public.get_stream_anomaly_summary(_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'window_days', _days,
    'total_events', (SELECT COUNT(*) FROM public.stream_events WHERE created_at > now() - make_interval(days => _days)),
    'suspicious_events', (SELECT COUNT(*) FROM public.stream_events WHERE is_suspicious AND created_at > now() - make_interval(days => _days)),
    'top_offenders', COALESCE((
      SELECT jsonb_agg(row_to_json(o)) FROM (
        SELECT user_id, COUNT(*) AS flags, MAX(anomaly_score) AS max_score, MAX(bot_score) AS max_bot
          FROM public.stream_anomaly_flags
         WHERE created_at > now() - make_interval(days => _days)
         GROUP BY user_id
         ORDER BY flags DESC
         LIMIT 20
      ) o
    ), '[]'::jsonb),
    'top_reasons', COALESCE((
      SELECT jsonb_agg(row_to_json(r)) FROM (
        SELECT reason, COUNT(*) AS hits
          FROM public.stream_anomaly_flags, unnest(reasons) AS reason
         WHERE created_at > now() - make_interval(days => _days)
         GROUP BY reason
         ORDER BY hits DESC
      ) r
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.get_stream_anomaly_summary(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stream_anomaly_summary(int) TO authenticated;
