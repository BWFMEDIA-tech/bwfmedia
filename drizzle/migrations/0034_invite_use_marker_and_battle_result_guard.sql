ALTER TABLE public.stage_participants ADD COLUMN IF NOT EXISTS invite_counted boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.battle_results_direct_write_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Direct API writes by signed-in users cannot change results; server code and
  -- vote-recalc functions run as privileged roles and are unaffected.
  IF current_user IN ('authenticated','anon') THEN
    IF TG_TABLE_NAME = 'battle_rounds' THEN
      NEW.winner_choice := OLD.winner_choice;
      NEW.a_votes := OLD.a_votes; NEW.b_votes := OLD.b_votes;
      NEW.a_weight := OLD.a_weight; NEW.b_weight := OLD.b_weight;
    ELSE
      NEW.winner_id := OLD.winner_id;
      NEW.a_wins := OLD.a_wins; NEW.b_wins := OLD.b_wins;
      IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS battle_rounds_result_guard ON public.battle_rounds;
CREATE TRIGGER battle_rounds_result_guard BEFORE UPDATE ON public.battle_rounds
FOR EACH ROW EXECUTE FUNCTION public.battle_results_direct_write_guard();
DROP TRIGGER IF EXISTS battle_matches_result_guard ON public.battle_matches;
CREATE TRIGGER battle_matches_result_guard BEFORE UPDATE ON public.battle_matches
FOR EACH ROW EXECUTE FUNCTION public.battle_results_direct_write_guard();