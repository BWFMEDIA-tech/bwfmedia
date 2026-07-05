
-- =====================================================================
-- Permanent Vote Persistence: artist lifetime totals + time rollups
-- =====================================================================

-- 1) Add device/session capture directly onto battle_votes (nullable, safe)
ALTER TABLE public.battle_votes
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS session_id text;

-- =====================================================================
-- 2) Artist lifetime vote totals (write-time trigger, exact counters)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.artist_vote_totals (
  artist_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lifetime_votes  bigint NOT NULL DEFAULT 0,
  lifetime_weight bigint NOT NULL DEFAULT 0,
  last_vote_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.artist_vote_totals TO anon, authenticated;
GRANT ALL    ON public.artist_vote_totals TO service_role;

ALTER TABLE public.artist_vote_totals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artist_vote_totals_public_read" ON public.artist_vote_totals;
CREATE POLICY "artist_vote_totals_public_read"
  ON public.artist_vote_totals FOR SELECT
  TO anon, authenticated USING (true);

-- Helper: resolve the artist targeted by a battle_vote row
CREATE OR REPLACE FUNCTION public.battle_vote_target_artist(_match_id uuid, _choice text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN _choice = 'a' THEN m.artist_a_id ELSE m.artist_b_id END
  FROM public.battle_matches m WHERE m.id = _match_id
$$;

-- Trigger: keep artist lifetime totals in sync on every INSERT/DELETE/UPDATE
CREATE OR REPLACE FUNCTION public.battle_votes_bump_artist_totals()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  old_artist uuid;
  new_artist uuid;
BEGIN
  IF TG_OP IN ('DELETE','UPDATE') THEN
    old_artist := public.battle_vote_target_artist(OLD.match_id, OLD.choice);
    IF old_artist IS NOT NULL THEN
      UPDATE public.artist_vote_totals
         SET lifetime_votes  = GREATEST(lifetime_votes  - 1, 0),
             lifetime_weight = GREATEST(lifetime_weight - OLD.weight, 0),
             updated_at      = now()
       WHERE artist_id = old_artist;
    END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    new_artist := public.battle_vote_target_artist(NEW.match_id, NEW.choice);
    IF new_artist IS NOT NULL THEN
      INSERT INTO public.artist_vote_totals (artist_id, lifetime_votes, lifetime_weight, last_vote_at, updated_at)
      VALUES (new_artist, 1, NEW.weight, NEW.created_at, now())
      ON CONFLICT (artist_id) DO UPDATE
        SET lifetime_votes  = artist_vote_totals.lifetime_votes  + 1,
            lifetime_weight = artist_vote_totals.lifetime_weight + EXCLUDED.lifetime_weight,
            last_vote_at    = GREATEST(artist_vote_totals.last_vote_at, EXCLUDED.last_vote_at),
            updated_at      = now();
    END IF;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS battle_votes_bump_artist_totals_trg ON public.battle_votes;
CREATE TRIGGER battle_votes_bump_artist_totals_trg
AFTER INSERT OR UPDATE OR DELETE ON public.battle_votes
FOR EACH ROW EXECUTE FUNCTION public.battle_votes_bump_artist_totals();

-- =====================================================================
-- 3) Time-bucketed rollups (day/week/month/year), refreshed by cron
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.artist_vote_rollups (
  artist_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket      text NOT NULL CHECK (bucket IN ('day','week','month','year')),
  bucket_date date NOT NULL,
  votes       bigint NOT NULL DEFAULT 0,
  weight      bigint NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (artist_id, bucket, bucket_date)
);

CREATE INDEX IF NOT EXISTS idx_artist_vote_rollups_bucket_date
  ON public.artist_vote_rollups (bucket, bucket_date DESC, weight DESC);
CREATE INDEX IF NOT EXISTS idx_artist_vote_rollups_artist
  ON public.artist_vote_rollups (artist_id);

GRANT SELECT ON public.artist_vote_rollups TO anon, authenticated;
GRANT ALL    ON public.artist_vote_rollups TO service_role;

ALTER TABLE public.artist_vote_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artist_vote_rollups_public_read" ON public.artist_vote_rollups;
CREATE POLICY "artist_vote_rollups_public_read"
  ON public.artist_vote_rollups FOR SELECT
  TO anon, authenticated USING (true);

-- Refresh function: recompute rollups for the trailing window
CREATE OR REPLACE FUNCTION public.refresh_artist_vote_rollups(_since interval DEFAULT interval '2 days')
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE affected int := 0;
BEGIN
  WITH recent AS (
    SELECT v.weight, v.created_at,
           public.battle_vote_target_artist(v.match_id, v.choice) AS artist_id
      FROM public.battle_votes v
     WHERE v.created_at >= now() - _since
  ),
  agg AS (
    SELECT artist_id, bucket, bucket_date, COUNT(*)::bigint AS votes, SUM(weight)::bigint AS weight
    FROM (
      SELECT artist_id, 'day'::text   AS bucket, date_trunc('day',   created_at)::date AS bucket_date, weight FROM recent
      UNION ALL
      SELECT artist_id, 'week'::text  AS bucket, date_trunc('week',  created_at)::date AS bucket_date, weight FROM recent
      UNION ALL
      SELECT artist_id, 'month'::text AS bucket, date_trunc('month', created_at)::date AS bucket_date, weight FROM recent
      UNION ALL
      SELECT artist_id, 'year'::text  AS bucket, date_trunc('year',  created_at)::date AS bucket_date, weight FROM recent
    ) s
    WHERE artist_id IS NOT NULL
    GROUP BY artist_id, bucket, bucket_date
  ),
  upserted AS (
    INSERT INTO public.artist_vote_rollups (artist_id, bucket, bucket_date, votes, weight, updated_at)
    SELECT artist_id, bucket, bucket_date, votes, weight, now() FROM agg
    ON CONFLICT (artist_id, bucket, bucket_date) DO UPDATE
      SET votes = EXCLUDED.votes, weight = EXCLUDED.weight, updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO affected FROM upserted;
  RETURN affected;
END $$;

-- Full rebuild (used for backfill and manual repair)
CREATE OR REPLACE FUNCTION public.rebuild_artist_vote_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE totals_count int; rollups_count int;
BEGIN
  -- Lifetime totals
  TRUNCATE public.artist_vote_totals;
  INSERT INTO public.artist_vote_totals (artist_id, lifetime_votes, lifetime_weight, last_vote_at, updated_at)
  SELECT public.battle_vote_target_artist(v.match_id, v.choice) AS artist_id,
         COUNT(*)::bigint, SUM(v.weight)::bigint, MAX(v.created_at), now()
    FROM public.battle_votes v
   GROUP BY 1
  HAVING public.battle_vote_target_artist(v.match_id, v.choice) IS NOT NULL;
  GET DIAGNOSTICS totals_count = ROW_COUNT;

  -- All-time rollups
  TRUNCATE public.artist_vote_rollups;
  INSERT INTO public.artist_vote_rollups (artist_id, bucket, bucket_date, votes, weight, updated_at)
  SELECT artist_id, bucket, bucket_date, COUNT(*)::bigint, SUM(weight)::bigint, now()
  FROM (
    SELECT public.battle_vote_target_artist(v.match_id, v.choice) AS artist_id,
           b.bucket, b.bucket_date, v.weight
      FROM public.battle_votes v
      CROSS JOIN LATERAL (VALUES
        ('day',   date_trunc('day',   v.created_at)::date),
        ('week',  date_trunc('week',  v.created_at)::date),
        ('month', date_trunc('month', v.created_at)::date),
        ('year',  date_trunc('year',  v.created_at)::date)
      ) AS b(bucket, bucket_date)
  ) s
  WHERE artist_id IS NOT NULL
  GROUP BY artist_id, bucket, bucket_date;
  GET DIAGNOSTICS rollups_count = ROW_COUNT;

  RETURN jsonb_build_object('artists', totals_count, 'rollup_rows', rollups_count, 'rebuilt_at', now());
END $$;

REVOKE ALL ON FUNCTION public.rebuild_artist_vote_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_artist_vote_rollups(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebuild_artist_vote_stats()          TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_artist_vote_rollups(interval) TO service_role;

-- =====================================================================
-- 4) Backfill from existing battle_votes
-- =====================================================================
SELECT public.rebuild_artist_vote_stats();

-- =====================================================================
-- 5) Realtime broadcast for new tables
-- =====================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_vote_totals;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_vote_rollups;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 6) Schedule the rollup refresh every 5 minutes (trailing 2-day window)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('refresh-artist-vote-rollups');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'refresh-artist-vote-rollups',
  '*/5 * * * *',
  $$ SELECT public.refresh_artist_vote_rollups(interval '2 days'); $$
);
