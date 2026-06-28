CREATE OR REPLACE FUNCTION public.play_tracks_enforce_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed CONSTANT jsonb := jsonb_build_object(
    'queued',    jsonb_build_array('playing','skipped','removed'),
    'playing',   jsonb_build_array('completed','skipped','queued'),
    'completed', jsonb_build_array('playing','queued','removed'),
    'skipped',   jsonb_build_array('playing','queued','removed'),
    'removed',   jsonb_build_array(),
    'done',      jsonb_build_array('completed','playing','queued','removed')
  );
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (allowed ? OLD.status) THEN
      RAISE EXCEPTION 'Unknown play_tracks.status %', OLD.status;
    END IF;
    IF NOT (allowed -> OLD.status ? NEW.status) THEN
      RAISE EXCEPTION 'Illegal play_tracks.status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.play_tracks
SET status = 'completed'
WHERE status = 'done';

DROP TRIGGER IF EXISTS trg_play_tracks_lifecycle ON public.play_tracks;
CREATE TRIGGER trg_play_tracks_lifecycle
BEFORE UPDATE ON public.play_tracks
FOR EACH ROW EXECUTE FUNCTION public.play_tracks_enforce_lifecycle();