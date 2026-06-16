
-- Phase 2: Play Arena Ranking Engine v2
-- Score = like_count - dislike_count + boost_weight (sum of last 60 min boost spends)

ALTER TABLE public.play_tracks
  ADD COLUMN IF NOT EXISTS boost_weight integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank_updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS play_tracks_stream_rank_idx
  ON public.play_tracks(stream_id, status, rank_score DESC, position);

CREATE INDEX IF NOT EXISTS boost_spends_track_created_idx
  ON public.boost_spends(track_id, created_at DESC);

-- Allow system (non-JWT) callers like pg_cron / recompute function to update
-- competition fields. User-driven calls always have auth.uid().
CREATE OR REPLACE FUNCTION public.play_tracks_block_competitive_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = NEW.stream_id AND s.host_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.like_count IS DISTINCT FROM OLD.like_count
     OR NEW.dislike_count IS DISTINCT FROM OLD.dislike_count
     OR NEW.boosted IS DISTINCT FROM OLD.boosted
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.stream_id IS DISTINCT FROM OLD.stream_id
     OR NEW.artist_user_id IS DISTINCT FROM OLD.artist_user_id THEN
    RAISE EXCEPTION 'Cannot modify protected competition fields on play_tracks';
  END IF;

  RETURN NEW;
END;
$$;

-- Recompute rankings for all active streams.
-- boost_weight = SUM(weight) over boost_spends in last 60 minutes per track.
-- rank_score   = like_count - dislike_count + boost_weight
-- Reorders position within each stream for queued tracks (highest rank first).
CREATE OR REPLACE FUNCTION public.recompute_play_arena_rankings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  WITH bw AS (
    SELECT t.id AS track_id,
           COALESCE(SUM(bs.weight) FILTER (
             WHERE bs.created_at > now() - interval '60 minutes'
           ), 0)::int AS weight
    FROM public.play_tracks t
    LEFT JOIN public.boost_spends bs ON bs.track_id = t.id
    WHERE t.status IN ('queued','playing')
    GROUP BY t.id
  )
  UPDATE public.play_tracks t
  SET boost_weight    = bw.weight,
      rank_score      = t.like_count - t.dislike_count + bw.weight,
      rank_updated_at = now(),
      updated_at      = now()
  FROM bw
  WHERE t.id = bw.track_id
    AND (t.boost_weight IS DISTINCT FROM bw.weight
         OR t.rank_score IS DISTINCT FROM (t.like_count - t.dislike_count + bw.weight));

  GET DIAGNOSTICS affected = ROW_COUNT;

  -- Re-order queued tracks per stream by rank_score DESC, then created_at ASC
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY stream_id
             ORDER BY rank_score DESC, created_at ASC
           )::int AS new_pos
    FROM public.play_tracks
    WHERE status = 'queued'
  )
  UPDATE public.play_tracks t
  SET position = r.new_pos,
      updated_at = now()
  FROM ranked r
  WHERE t.id = r.id
    AND t.position IS DISTINCT FROM r.new_pos;

  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_play_arena_rankings() TO service_role;

-- Schedule recompute every minute (SQL-only, no HTTP needed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('recompute-play-arena-rankings');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'recompute-play-arena-rankings',
  '* * * * *',
  $$ SELECT public.recompute_play_arena_rankings(); $$
);
