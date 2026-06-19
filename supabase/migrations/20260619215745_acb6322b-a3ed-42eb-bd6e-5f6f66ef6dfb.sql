
ALTER TABLE public.play_tracks
  ADD COLUMN IF NOT EXISTS battle_match_id uuid REFERENCES public.battle_matches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS battle_side text CHECK (battle_side IN ('a','b'));

CREATE INDEX IF NOT EXISTS idx_play_tracks_battle ON public.play_tracks (battle_match_id, battle_side, status);

-- Extend the protected-fields trigger so non-host/non-admin can't tamper with battle assignment.
CREATE OR REPLACE FUNCTION public.play_tracks_block_competitive_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     OR NEW.artist_user_id IS DISTINCT FROM OLD.artist_user_id
     OR NEW.battle_match_id IS DISTINCT FROM OLD.battle_match_id
     OR NEW.battle_side IS DISTINCT FROM OLD.battle_side THEN
    RAISE EXCEPTION 'Cannot modify protected competition fields on play_tracks';
  END IF;

  RETURN NEW;
END;
$function$;
