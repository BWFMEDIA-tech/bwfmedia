CREATE OR REPLACE FUNCTION public.battle_challenge_mark_agreed(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  IF NOT (public.has_role(uid, 'host') OR public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'Only hosts and admins can confirm challenge agreement';
  END IF;
  PERFORM set_config('app.genre_agree', 'on', true);
  UPDATE public.battle_matches
    SET genre_agreed_a = true, genre_agreed_b = true
    WHERE id = _match_id AND status = 'pending';
  PERFORM set_config('app.genre_agree', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.battle_challenge_mark_agreed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.battle_challenge_mark_agreed(uuid) TO authenticated;