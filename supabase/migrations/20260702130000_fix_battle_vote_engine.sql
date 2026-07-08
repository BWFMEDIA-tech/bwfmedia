-- ============ Battle vote engine fix ============
-- Eliminates every double-count / duplicate-write path and enforces one
-- locked vote per user per round:
--
--  * battle_votes_match_voter_uniq (one vote per MATCH) conflicted with the
--    intended unique(round_id, voter_id): voting in a later round either
--    errored (direct upsert path) or silently rewrote the user's row from an
--    earlier — possibly closed — round (old cast_battle_vote upserted
--    ON CONFLICT (match_id, voter_id) without changing round_id, corrupting
--    finished rounds' tallies).
--  * Two competing write paths existed (direct client upsert with RLS +
--    a 6-arg cast_battle_vote RPC). Votes are now RPC-only and immutable:
--    no INSERT/UPDATE policies, no client table grants, one RPC.
--  * The old RPC inserted its own 'allowed' audit row while the
--    battle_votes_log_allowed trigger logged the same insert (double audit
--    rows), and its 'blocked' audit inserts were rolled back by the RAISE
--    that followed them. The new RPC returns structured rejections instead
--    of raising, so audit rows persist, and never writes 'allowed' rows
--    (the trigger owns that).
--  * Boost charging now happens inside the vote transaction: a rejected
--    vote can no longer burn a boost credit.
--
-- Tallies remain maintained by the battle_votes_recalc trigger (recompute
-- from SUM over the round — the single tally authority).

-- 1. One vote per user per ROUND (unique(round_id, voter_id) ships with the
--    table). Drop the match-level unique that broke multi-round voting.
DROP INDEX IF EXISTS public.battle_votes_match_voter_uniq;

-- 2. Only weights 1 (standard) and 5 (Investor Boost) are permitted.
UPDATE public.battle_votes
   SET weight = CASE WHEN weight >= 5 THEN 5 ELSE 1 END
 WHERE weight NOT IN (1, 5);
ALTER TABLE public.battle_votes DROP CONSTRAINT IF EXISTS battle_votes_weight_check;
ALTER TABLE public.battle_votes
  ADD CONSTRAINT battle_votes_weight_check CHECK (weight IN (1, 5));

-- 3. Votes are immutable and RPC-only. Remove every client write path.
DROP POLICY IF EXISTS battle_votes_insert_strict ON public.battle_votes;
DROP POLICY IF EXISTS battle_votes_insert_self_live_round ON public.battle_votes;
DROP POLICY IF EXISTS battle_votes_update_own ON public.battle_votes;
REVOKE INSERT, UPDATE, DELETE ON public.battle_votes FROM authenticated;

-- 4. Kill the old RPC signature (the match-level upsert path).
DROP FUNCTION IF EXISTS public.cast_battle_vote(uuid, uuid, text, integer, text, text);

-- 5. Live vote totals straight from accepted votes (bypasses the select-own
--    RLS on battle_votes; aggregates only, no row exposure).
CREATE OR REPLACE FUNCTION public.get_round_vote_totals(_round_id uuid)
RETURNS TABLE(a_weight int, b_weight int, a_votes int, b_votes int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(v.weight) FILTER (WHERE v.choice = 'a'), 0)::int,
         COALESCE(SUM(v.weight) FILTER (WHERE v.choice = 'b'), 0)::int,
         COALESCE(COUNT(*)      FILTER (WHERE v.choice = 'a'), 0)::int,
         COALESCE(COUNT(*)      FILTER (WHERE v.choice = 'b'), 0)::int
    FROM public.battle_votes v
   WHERE v.round_id = _round_id;
$$;

REVOKE ALL ON FUNCTION public.get_round_vote_totals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_round_vote_totals(uuid) TO anon, authenticated, service_role;

-- 6. The single vote entry point.
CREATE OR REPLACE FUNCTION public.cast_battle_vote(
  _round_id uuid,
  _choice text,
  _use_boost boolean DEFAULT false,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_match_id uuid;
  new_id uuid;
  v_weight int := 1;
  t record;
  v_total int;
  v_a_pct numeric := 0;
  v_b_pct numeric := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _choice NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'invalid choice';
  END IF;

  SELECT r.match_id INTO v_match_id
    FROM public.battle_rounds r
    JOIN public.battle_matches m ON m.id = r.match_id
   WHERE r.id = _round_id
     AND r.status = 'live' AND r.voting_status = 'open' AND m.status = 'live';

  IF v_match_id IS NULL THEN
    -- Scalar subquery so the audit row is written even when the round id
    -- doesn't exist at all (match_id is simply NULL in that case).
    INSERT INTO public.battle_vote_attempts(match_id, voter_id, outcome, reason, ip, user_agent, metadata)
    VALUES (
      (SELECT r.match_id FROM public.battle_rounds r WHERE r.id = _round_id),
      uid, 'blocked', 'ineligible_round', _ip, _user_agent,
      jsonb_build_object('round_id', _round_id, 'choice', _choice)
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'ineligible_round',
                              'message', 'Voting is closed for this round');
  END IF;

  -- Charge the boost inside this transaction; a later rejection cannot burn
  -- the credit because we return (not raise) on business rejections that
  -- happen after this point... except 'already_voted', which is checked via
  -- ON CONFLICT below — so spend only after confirming no existing vote.
  IF EXISTS (
    SELECT 1 FROM public.battle_votes v
     WHERE v.round_id = _round_id AND v.voter_id = uid
  ) THEN
    INSERT INTO public.battle_vote_attempts(match_id, voter_id, outcome, reason, ip, user_agent, metadata)
    VALUES (v_match_id, uid, 'blocked', 'already_voted', _ip, _user_agent,
            jsonb_build_object('round_id', _round_id, 'choice', _choice));
    RETURN jsonb_build_object('ok', false, 'reason', 'already_voted',
                              'message', 'Your vote is locked in.');
  END IF;

  IF _use_boost THEN
    BEGIN
      PERFORM public.spend_boost_credit('spend_boost', _round_id::text, 1);
      v_weight := 5;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.battle_vote_attempts(match_id, voter_id, outcome, reason, ip, user_agent, metadata)
      VALUES (v_match_id, uid, 'blocked', 'no_boost_credits', _ip, _user_agent,
              jsonb_build_object('round_id', _round_id, 'choice', _choice));
      RETURN jsonb_build_object('ok', false, 'reason', 'no_boost_credits',
                                'message', 'No boost credits available');
    END;
  END IF;

  -- Race-safe duplicate guard: a concurrent vote between the check above and
  -- here lands on the unique(round_id, voter_id) constraint.
  INSERT INTO public.battle_votes(match_id, round_id, voter_id, choice, weight)
  VALUES (v_match_id, _round_id, uid, _choice, v_weight)
  ON CONFLICT (round_id, voter_id) DO NOTHING
  RETURNING id INTO new_id;

  IF new_id IS NULL THEN
    -- Concurrent duplicate. Do not increment anything; the boost spend above
    -- must not survive either, so this path raises to roll the tx back. The
    -- caller logs the blocked attempt out-of-band.
    RAISE EXCEPTION 'Your vote is locked in.' USING ERRCODE = 'P0001';
  END IF;

  -- battle_votes_recalc (AFTER INSERT trigger) has already recomputed the
  -- round tallies from SUM. Recalculate independently from accepted votes
  -- and assert the denormalized columns agree; heal them if they drifted.
  SELECT * INTO t FROM public.get_round_vote_totals(_round_id);
  v_total := t.a_weight + t.b_weight;

  PERFORM 1 FROM public.battle_rounds r
   WHERE r.id = _round_id
     AND (r.a_weight <> t.a_weight OR r.b_weight <> t.b_weight
          OR r.a_votes <> t.a_votes OR r.b_votes <> t.b_votes);
  IF FOUND THEN
    RAISE LOG 'battle_vote tally drift on round % — healing from live votes', _round_id;
    UPDATE public.battle_rounds
       SET a_weight = t.a_weight, b_weight = t.b_weight,
           a_votes = t.a_votes, b_votes = t.b_votes, updated_at = now()
     WHERE id = _round_id;
  END IF;

  IF v_total > 0 THEN
    v_a_pct := round(t.a_weight * 10000.0 / v_total) / 100.0;
    v_b_pct := 100 - v_a_pct;
  END IF;

  -- Debug log after every accepted vote (requirement 7).
  RAISE LOG 'Round: % | Artist A Weight: % | Artist B Weight: % | Total Weight: % | Artist A %%: % | Artist B %%: % | Sum: 100%%',
    _round_id, t.a_weight, t.b_weight, v_total, v_a_pct, v_b_pct;

  -- The battle_votes_log_allowed trigger recorded the 'allowed' attempt for
  -- this insert; just backfill ip/ua onto it (no second 'allowed' row).
  UPDATE public.battle_vote_attempts
     SET ip = COALESCE(ip, _ip), user_agent = COALESCE(user_agent, _user_agent)
   WHERE voter_id = uid AND match_id = v_match_id AND outcome = 'allowed'
     AND created_at > now() - interval '5 seconds';

  RETURN jsonb_build_object(
    'ok', true,
    'vote_id', new_id,
    'round_id', _round_id,
    'choice', _choice,
    'weight', v_weight,
    'boosted', v_weight = 5,
    'a_weight', t.a_weight,
    'b_weight', t.b_weight,
    'total_weight', v_total,
    'a_votes', t.a_votes,
    'b_votes', t.b_votes,
    'a_pct', v_a_pct,
    'b_pct', v_b_pct
  );
END $$;

REVOKE ALL ON FUNCTION public.cast_battle_vote(uuid, text, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_battle_vote(uuid, text, boolean, text, text) TO authenticated, service_role;

-- 7. Round reset (requirement 6): a (re)started round begins at zero — no
--    carryover votes. Host/admin only; called by the battle engine when a
--    round row is created or reused.
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
  IF uid IS NULL OR (uid <> v_host AND NOT public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'Only the host can reset a round';
  END IF;

  DELETE FROM public.battle_votes WHERE round_id = _round_id;
  UPDATE public.battle_rounds
     SET a_votes = 0, b_votes = 0, a_weight = 0, b_weight = 0, updated_at = now()
   WHERE id = _round_id;
END $$;

REVOKE ALL ON FUNCTION public.reset_round_votes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_round_votes(uuid) TO authenticated, service_role;

-- 8. Repair history: recompute every round's tallies from accepted votes.
UPDATE public.battle_rounds r
   SET a_weight = COALESCE(s.a_w, 0),
       b_weight = COALESCE(s.b_w, 0),
       a_votes  = COALESCE(s.a_c, 0),
       b_votes  = COALESCE(s.b_c, 0)
  FROM (
    SELECT round_id,
           SUM(weight) FILTER (WHERE choice = 'a')::int AS a_w,
           SUM(weight) FILTER (WHERE choice = 'b')::int AS b_w,
           COUNT(*)    FILTER (WHERE choice = 'a')::int AS a_c,
           COUNT(*)    FILTER (WHERE choice = 'b')::int AS b_c
      FROM public.battle_votes
     GROUP BY round_id
  ) s
 WHERE s.round_id = r.id;

UPDATE public.battle_rounds r
   SET a_weight = 0, b_weight = 0, a_votes = 0, b_votes = 0
 WHERE NOT EXISTS (SELECT 1 FROM public.battle_votes v WHERE v.round_id = r.id)
   AND (r.a_weight <> 0 OR r.b_weight <> 0 OR r.a_votes <> 0 OR r.b_votes <> 0);
