-- Audit log for battle vote attempts (allowed + blocked)
CREATE TABLE public.battle_vote_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid,
  voter_id uuid,
  outcome text NOT NULL CHECK (outcome IN ('allowed','blocked')),
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.battle_vote_attempts TO authenticated;
GRANT ALL ON public.battle_vote_attempts TO service_role;

ALTER TABLE public.battle_vote_attempts ENABLE ROW LEVEL SECURITY;

-- Voters can see their own attempts; admins can see all. No client writes.
CREATE POLICY battle_vote_attempts_select_own
  ON public.battle_vote_attempts FOR SELECT
  TO authenticated
  USING (voter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX battle_vote_attempts_match_idx ON public.battle_vote_attempts(match_id, created_at DESC);
CREATE INDEX battle_vote_attempts_voter_idx ON public.battle_vote_attempts(voter_id, created_at DESC);
CREATE INDEX battle_vote_attempts_outcome_idx ON public.battle_vote_attempts(outcome, created_at DESC);

-- Trigger: log every successful insert into battle_votes as 'allowed'
CREATE OR REPLACE FUNCTION public.battle_votes_log_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.battle_vote_attempts(match_id, voter_id, outcome, reason, metadata)
  VALUES (
    NEW.match_id,
    NEW.voter_id,
    'allowed',
    'rls_passed',
    jsonb_build_object('round_id', NEW.round_id, 'choice', NEW.choice, 'weight', NEW.weight)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS battle_votes_log_allowed_trg ON public.battle_votes;
CREATE TRIGGER battle_votes_log_allowed_trg
  AFTER INSERT ON public.battle_votes
  FOR EACH ROW EXECUTE FUNCTION public.battle_votes_log_allowed();

-- SECURITY DEFINER function the client (or server fn) calls when an insert is
-- rejected by RLS / unique index / business rule, so we can still record the
-- blocked attempt for monitoring.
CREATE OR REPLACE FUNCTION public.log_battle_vote_blocked(
  _match_id uuid,
  _reason text,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  IF _reason IS NULL OR length(_reason) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  -- Rate-limit: at most 1 row per (voter, match, reason) per 5 seconds to
  -- prevent log flooding from a hot-looping client.
  IF EXISTS (
    SELECT 1 FROM public.battle_vote_attempts
    WHERE voter_id = uid
      AND match_id IS NOT DISTINCT FROM _match_id
      AND reason = _reason
      AND outcome = 'blocked'
      AND created_at > now() - interval '5 seconds'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.battle_vote_attempts(match_id, voter_id, outcome, reason, metadata)
  VALUES (_match_id, uid, 'blocked', _reason, COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION public.log_battle_vote_blocked(uuid, text, jsonb) TO authenticated;

-- Realtime for admin monitoring dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_vote_attempts;