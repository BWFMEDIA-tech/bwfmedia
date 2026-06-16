
-- =========================================================
-- live_submissions: status + queue_status lifecycle
-- =========================================================
CREATE OR REPLACE FUNCTION public.live_submissions_enforce_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed_status CONSTANT jsonb := jsonb_build_object(
    'pending',          jsonb_build_array('awaiting_payment','paid','cancelled'),
    'awaiting_payment', jsonb_build_array('paid','cancelled','failed'),
    'paid',             jsonb_build_array('queued','refunded'),
    'queued',           jsonb_build_array('playing','cancelled'),
    'playing',          jsonb_build_array('completed','skipped'),
    'completed',        jsonb_build_array(),
    'cancelled',        jsonb_build_array(),
    'failed',           jsonb_build_array(),
    'refunded',         jsonb_build_array(),
    'skipped',          jsonb_build_array()
  );
  allowed_queue CONSTANT jsonb := jsonb_build_object(
    'queued',    jsonb_build_array('playing','skipped','cancelled'),
    'playing',   jsonb_build_array('completed','skipped'),
    'completed', jsonb_build_array(),
    'skipped',   jsonb_build_array(),
    'cancelled', jsonb_build_array()
  );
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (allowed_status ? OLD.status) THEN
        RAISE EXCEPTION 'Unknown live_submissions.status %', OLD.status;
      END IF;
      IF NOT (allowed_status -> OLD.status ? NEW.status) THEN
        RAISE EXCEPTION 'Illegal live_submissions.status transition: % -> %', OLD.status, NEW.status;
      END IF;
    END IF;

    IF NEW.queue_status IS DISTINCT FROM OLD.queue_status
       AND OLD.queue_status IS NOT NULL
       AND NEW.queue_status IS NOT NULL THEN
      IF NOT (allowed_queue ? OLD.queue_status) THEN
        RAISE EXCEPTION 'Unknown live_submissions.queue_status %', OLD.queue_status;
      END IF;
      IF NOT (allowed_queue -> OLD.queue_status ? NEW.queue_status) THEN
        RAISE EXCEPTION 'Illegal live_submissions.queue_status transition: % -> %', OLD.queue_status, NEW.queue_status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_submissions_lifecycle ON public.live_submissions;
CREATE TRIGGER trg_live_submissions_lifecycle
BEFORE UPDATE ON public.live_submissions
FOR EACH ROW EXECUTE FUNCTION public.live_submissions_enforce_lifecycle();

-- =========================================================
-- play_tracks: status lifecycle
-- =========================================================
CREATE OR REPLACE FUNCTION public.play_tracks_enforce_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed CONSTANT jsonb := jsonb_build_object(
    'queued',    jsonb_build_array('playing','skipped','removed'),
    'playing',   jsonb_build_array('completed','skipped'),
    'completed', jsonb_build_array(),
    'skipped',   jsonb_build_array(),
    'removed',   jsonb_build_array()
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

DROP TRIGGER IF EXISTS trg_play_tracks_lifecycle ON public.play_tracks;
CREATE TRIGGER trg_play_tracks_lifecycle
BEFORE UPDATE ON public.play_tracks
FOR EACH ROW EXECUTE FUNCTION public.play_tracks_enforce_lifecycle();
