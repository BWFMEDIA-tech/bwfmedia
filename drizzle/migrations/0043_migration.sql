CREATE OR REPLACE FUNCTION public.reset_round_votes(_round_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_host uuid;
BEGIN
  SELECT m.host_id INTO v_host
    FROM public.battle_rounds r
    JOIN public.battle_matches m ON m.id = r.match_id
   WHERE r.id = _round_id;
  IF v_host IS NULL THEN
    RAISE EXCEPTION 'round not found';
  END IF;
  -- The battle engine verifies the host before calling with the server role.
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF uid IS NULL OR (uid <> v_host AND NOT public.has_role(uid, 'admin')) THEN
      RAISE EXCEPTION 'Only the host can reset a round';
    END IF;
  END IF;

  DELETE FROM public.battle_votes WHERE round_id = _round_id;
  UPDATE public.battle_rounds
     SET a_votes = 0, b_votes = 0, a_weight = 0, b_weight = 0, updated_at = now()
   WHERE id = _round_id;
END $$;

REVOKE ALL ON FUNCTION public.reset_round_votes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_round_votes(uuid) TO authenticated, service_role;