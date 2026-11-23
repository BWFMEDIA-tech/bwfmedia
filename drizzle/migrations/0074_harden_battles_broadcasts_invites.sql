ALTER TABLE public.stage_participants ADD COLUMN IF NOT EXISTS invite_code text;

REVOKE EXECUTE ON FUNCTION public.battle_challenge_mark_agreed(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.battle_rounds_insert_result_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.winner_choice := NULL;
    NEW.a_votes := 0; NEW.b_votes := 0; NEW.a_weight := 0; NEW.b_weight := 0;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS battle_rounds_insert_result_guard ON public.battle_rounds;
CREATE TRIGGER battle_rounds_insert_result_guard BEFORE INSERT ON public.battle_rounds
FOR EACH ROW EXECUTE FUNCTION public.battle_rounds_insert_result_guard();

CREATE OR REPLACE FUNCTION public.broadcasts_viewer_count_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN NEW.viewer_count := 0;
    ELSE NEW.viewer_count := OLD.viewer_count; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS broadcasts_viewer_count_guard ON public.broadcasts;
CREATE TRIGGER broadcasts_viewer_count_guard BEFORE INSERT OR UPDATE ON public.broadcasts
FOR EACH ROW EXECUTE FUNCTION public.broadcasts_viewer_count_guard();