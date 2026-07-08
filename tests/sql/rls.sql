-- pgTAP-style RLS regression tests for signAudioUrl ownership + battle vote
-- enforcement. Runs against the live Lovable Cloud database via
-- `psql -f tests/sql/rls.sql`. The Lovable Cloud psql role cannot SET ROLE
-- to anon/authenticated, so these tests verify the structural invariants
-- RLS depends on: required policies, grants, and SECURITY DEFINER functions.
-- Behaviour is covered by the application-level integration tests in
-- `castBattleVote` and `signAudioUrl`.
--
-- Each assertion prints `ok - <name>` or RAISEs and the script exits 1.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(_cond boolean, _name text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF _cond THEN
    RAISE NOTICE 'ok   - %', _name;
  ELSE
    RAISE EXCEPTION 'not ok - %', _name;
  END IF;
END $$;

DO $$
DECLARE
  v_count int;
  ok bool;
  qual text;
BEGIN
  -- 1. battle_votes has RLS enabled
  SELECT relrowsecurity INTO ok FROM pg_class
   WHERE oid = 'public.battle_votes'::regclass;
  PERFORM pg_temp.assert(ok, 'battle_votes has RLS enabled');

  -- 2. battle_votes is RPC-only and immutable: no client write policies, no
  --    client write grants, one locked vote per (round_id, voter_id), and no
  --    match-level unique (which broke multi-round voting).
  SELECT count(*) INTO v_count FROM pg_policy
   WHERE polrelid='public.battle_votes'::regclass AND polcmd IN ('a','w','d');
  PERFORM pg_temp.assert(v_count = 0, 'battle_votes has no client write policies (RPC-only writes)');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name='battle_votes'
      AND grantee='authenticated' AND privilege_type IN ('INSERT','UPDATE','DELETE')
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'battle_votes has no client write grants');

  SELECT count(*) INTO v_count FROM pg_constraint
   WHERE conrelid='public.battle_votes'::regclass AND contype='u';
  PERFORM pg_temp.assert(v_count = 1, 'battle_votes has exactly one unique constraint');

  SELECT count(*) INTO v_count FROM pg_indexes
   WHERE schemaname='public' AND tablename='battle_votes'
     AND indexname='battle_votes_match_voter_uniq';
  PERFORM pg_temp.assert(v_count = 0, 'battle_votes match-level unique index removed');

  SELECT pg_get_constraintdef(oid) INTO qual FROM pg_constraint
   WHERE conrelid='public.battle_votes'::regclass AND conname='battle_votes_weight_check';
  PERFORM pg_temp.assert(qual ILIKE '%1, 5%', 'battle_votes weight limited to 1 or 5');

  -- 3. cast_battle_vote function exists and is locked down
  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='cast_battle_vote';
  PERFORM pg_temp.assert(v_count = 1, 'cast_battle_vote() exists');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema='public' AND routine_name='cast_battle_vote'
      AND grantee='anon'
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'cast_battle_vote() not executable by anon');

  -- 4. signed_audio_access_log has a RESTRICTIVE no-client-write policy
  SELECT count(*) INTO v_count FROM pg_policy
   WHERE polrelid='public.signed_audio_access_log'::regclass
     AND polname='signed_audio_access_log_no_client_write'
     AND polpermissive = false;
  PERFORM pg_temp.assert(v_count = 1, 'signed_audio_access_log has RESTRICTIVE client-write block');

  -- 5. rate_limit_hits is locked to clients and has no anon/auth grants
  SELECT count(*) INTO v_count FROM pg_policy
   WHERE polrelid='public.rate_limit_hits'::regclass AND polpermissive = false;
  PERFORM pg_temp.assert(v_count >= 2, 'rate_limit_hits has RESTRICTIVE client policies');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name='rate_limit_hits'
      AND grantee IN ('anon','authenticated')
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'rate_limit_hits has no anon/authenticated grants');

  -- 6. check_rate_limit() not executable by clients
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema='public' AND routine_name='check_rate_limit'
      AND grantee IN ('anon','authenticated')
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'check_rate_limit() not executable by clients');

  -- 7. battle_vote_attempts captures ip + user_agent for forensics
  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_schema='public' AND table_name='battle_vote_attempts'
     AND column_name IN ('ip','user_agent');
  PERFORM pg_temp.assert(v_count = 2, 'battle_vote_attempts captures ip + user_agent');

  -- 8. battle_reactions: RLS on, one-reaction unique constraint, no client write path
  SELECT relrowsecurity INTO ok FROM pg_class
   WHERE oid = 'public.battle_reactions'::regclass;
  PERFORM pg_temp.assert(ok, 'battle_reactions has RLS enabled');

  SELECT count(*) INTO v_count FROM pg_constraint
   WHERE conrelid = 'public.battle_reactions'::regclass
     AND contype = 'u' AND conname = 'battle_reactions_one_per_artist';
  PERFORM pg_temp.assert(v_count = 1, 'battle_reactions enforces one reaction per (user, battle, artist)');

  SELECT count(*) INTO v_count FROM pg_policy
   WHERE polrelid = 'public.battle_reactions'::regclass
     AND polcmd IN ('a', 'w', 'd');
  PERFORM pg_temp.assert(v_count = 0, 'battle_reactions has no client write policies (RPC-only writes)');

  -- 9. battle_scores: RLS on, no client write path
  SELECT relrowsecurity INTO ok FROM pg_class
   WHERE oid = 'public.battle_scores'::regclass;
  PERFORM pg_temp.assert(ok, 'battle_scores has RLS enabled');

  SELECT count(*) INTO v_count FROM pg_policy
   WHERE polrelid = 'public.battle_scores'::regclass
     AND polcmd IN ('a', 'w', 'd');
  PERFORM pg_temp.assert(v_count = 0, 'battle_scores has no client write policies (RPC-only writes)');

  -- 10. react_to_battle() exists and is not executable by anon
  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='react_to_battle';
  PERFORM pg_temp.assert(v_count = 1, 'react_to_battle() exists');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema='public' AND routine_name='react_to_battle'
      AND grantee='anon'
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'react_to_battle() not executable by anon');

  -- 11. battle_scores broadcasts score changes on battle:{battle_id}
  SELECT count(*) INTO v_count FROM pg_trigger
   WHERE tgrelid = 'public.battle_scores'::regclass
     AND tgname = 'battle_scores_broadcast' AND NOT tgisinternal;
  PERFORM pg_temp.assert(v_count = 1, 'battle_scores has the realtime broadcast trigger');

  -- 12. vote engine helper functions: live totals readable, reset host-gated
  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='get_round_vote_totals';
  PERFORM pg_temp.assert(v_count = 1, 'get_round_vote_totals() exists');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema='public' AND routine_name='reset_round_votes'
      AND grantee='anon'
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'reset_round_votes() not executable by anon');

  -- 13. battle_votes tally trigger is the single recompute authority
  SELECT count(*) INTO v_count FROM pg_trigger
   WHERE tgrelid = 'public.battle_votes'::regclass
     AND tgname = 'battle_votes_recalc_trg' AND NOT tgisinternal;
  PERFORM pg_temp.assert(v_count = 1, 'battle_votes has the tally recompute trigger');

  RAISE NOTICE 'RLS regression suite passed';
END $$;

ROLLBACK;
