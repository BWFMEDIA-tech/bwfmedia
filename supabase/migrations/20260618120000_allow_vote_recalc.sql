-- Allow play_votes_recalc trigger to update protected fields on play_tracks.
-- Any authenticated user (guest, listener, artist, audience) can vote; the
-- recalc cascade must not be rejected by the competitive-write guard.
CREATE OR REPLACE FUNCTION public.play_tracks_block_competitive_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role, unauthenticated cron, and cascaded trigger updates
  -- (e.g. play_votes_recalc updating score/like_count/dislike_count).
  IF auth.role() = 'service_role' OR auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN
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
$function$;

-- Ensure realtime delivers vote/track changes to every subscriber.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.play_tracks;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.play_votes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
