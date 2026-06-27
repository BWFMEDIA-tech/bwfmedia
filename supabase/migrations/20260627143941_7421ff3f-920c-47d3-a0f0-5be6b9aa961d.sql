-- ============ rate limiting ============
CREATE TABLE public.rate_limit_hits (
  id bigserial PRIMARY KEY,
  bucket_key text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limit_hits_lookup_idx
  ON public.rate_limit_hits (action, bucket_key, created_at DESC);

GRANT ALL ON public.rate_limit_hits TO service_role;
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- No client policies: only service_role/security-definer functions touch it.
CREATE POLICY rate_limit_hits_no_client_select ON public.rate_limit_hits
  AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY rate_limit_hits_no_client_write ON public.rate_limit_hits
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket_key text,
  _action text,
  _max_hits int,
  _window_secs int
) RETURNS TABLE(allowed boolean, hits int, retry_after_secs int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recent int;
  oldest timestamptz;
BEGIN
  IF _bucket_key IS NULL OR _action IS NULL OR _max_hits IS NULL OR _window_secs IS NULL THEN
    RAISE EXCEPTION 'check_rate_limit: missing args';
  END IF;

  -- Opportunistic cleanup (cheap, no lock-heavy DELETE).
  DELETE FROM public.rate_limit_hits
   WHERE action = _action
     AND created_at < now() - make_interval(secs => _window_secs * 4);

  SELECT count(*), min(created_at) INTO recent, oldest
    FROM public.rate_limit_hits
   WHERE action = _action
     AND bucket_key = _bucket_key
     AND created_at > now() - make_interval(secs => _window_secs);

  IF recent >= _max_hits THEN
    RETURN QUERY SELECT false,
      recent,
      GREATEST(1, _window_secs - EXTRACT(EPOCH FROM (now() - oldest))::int);
    RETURN;
  END IF;

  INSERT INTO public.rate_limit_hits(bucket_key, action) VALUES (_bucket_key, _action);
  RETURN QUERY SELECT true, recent + 1, 0;
END $$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, int, int) TO service_role;

-- ============ signed-audio access audit ============
CREATE TABLE public.signed_audio_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  outcome text NOT NULL CHECK (outcome IN ('allowed','denied','rate_limited','invalid')),
  reason text NOT NULL,
  storage_path text,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX signed_audio_access_log_user_idx
  ON public.signed_audio_access_log (user_id, created_at DESC);
CREATE INDEX signed_audio_access_log_outcome_idx
  ON public.signed_audio_access_log (outcome, created_at DESC);

GRANT SELECT ON public.signed_audio_access_log TO authenticated;
GRANT ALL ON public.signed_audio_access_log TO service_role;
ALTER TABLE public.signed_audio_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY signed_audio_access_log_admin_read ON public.signed_audio_access_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY signed_audio_access_log_no_client_write ON public.signed_audio_access_log
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ============ extend battle_vote_attempts with ip/ua ============
ALTER TABLE public.battle_vote_attempts
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- ============ server-side vote cast with audit + boost-credit charge ============
-- Charges a boost activation when weight = 5, then inserts the vote.
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

  -- Eligibility (mirrors RLS so we get a clean reason instead of a policy error).
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

  UPDATE public.battle_vote_attempts
     SET ip = COALESCE(ip, _ip), user_agent = COALESCE(user_agent, _user_agent)
   WHERE voter_id = uid AND match_id = _match_id AND outcome = 'allowed'
     AND created_at > now() - interval '5 seconds';

  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.cast_battle_vote(uuid,uuid,text,int,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cast_battle_vote(uuid,uuid,text,int,text,text) TO authenticated, service_role;
