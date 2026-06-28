
CREATE OR REPLACE FUNCTION public.cast_battle_vote(
  _match_id uuid,
  _round_id uuid,
  _choice text,
  _weight int,
  _ip text,
  _user_agent text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
  has_active boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000';
  END IF;
  IF _choice NOT IN ('a','b') THEN
    RAISE EXCEPTION 'invalid choice';
  END IF;
  IF _weight NOT IN (1,5) THEN
    RAISE EXCEPTION 'invalid weight';
  END IF;

  IF _weight = 5 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.arena_power_up_activations
       WHERE user_id = uid AND expires_at > now()
    ) INTO has_active;
    IF NOT has_active THEN
      INSERT INTO public.battle_vote_attempts(match_id, voter_id, outcome, reason, ip, user_agent, metadata)
      VALUES (_match_id, uid, 'blocked', 'no_active_power_up', _ip, _user_agent,
              jsonb_build_object('round_id', _round_id, 'choice', _choice, 'weight', _weight));
      RAISE EXCEPTION 'No active power-up for weighted vote' USING ERRCODE='P0001';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.battle_rounds r
      JOIN public.battle_matches m ON m.id = r.match_id
     WHERE r.id = _round_id AND r.match_id = _match_id
       AND r.status='live' AND r.voting_status='open' AND m.status='live'
       AND uid <> m.artist_a_id AND uid <> m.artist_b_id
  ) THEN
    INSERT INTO public.battle_vote_attempts(match_id, voter_id, outcome, reason, ip, user_agent, metadata)
    VALUES (_match_id, uid, 'blocked', 'ineligible_round_or_self_vote', _ip, _user_agent,
            jsonb_build_object('round_id', _round_id, 'choice', _choice, 'weight', _weight));
    RAISE EXCEPTION 'Vote not allowed for this round' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.battle_votes(match_id, round_id, voter_id, choice, weight)
  VALUES (_match_id, _round_id, uid, _choice, _weight)
  ON CONFLICT (match_id, voter_id) DO UPDATE
     SET choice = EXCLUDED.choice, weight = EXCLUDED.weight
  RETURNING id INTO new_id;

  -- Recompute the running tally on the round so all clients see the bars
  -- move in real time. battle_rounds is in supabase_realtime so this UPDATE
  -- broadcasts to every subscriber.
  UPDATE public.battle_rounds
     SET a_weight = COALESCE((SELECT SUM(weight) FROM public.battle_votes v
                               WHERE v.round_id = _round_id AND v.choice = 'a'), 0),
         b_weight = COALESCE((SELECT SUM(weight) FROM public.battle_votes v
                               WHERE v.round_id = _round_id AND v.choice = 'b'), 0)
   WHERE id = _round_id;

  UPDATE public.battle_vote_attempts
     SET ip = COALESCE(ip, _ip), user_agent = COALESCE(user_agent, _user_agent)
   WHERE voter_id = uid AND match_id = _match_id AND outcome = 'allowed'
     AND created_at > now() - interval '5 seconds';

  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.cast_battle_vote(uuid,uuid,text,int,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cast_battle_vote(uuid,uuid,text,int,text,text) TO authenticated, service_role;
