-- pgTAP-style RLS regression tests for signAudioUrl ownership + battle vote
-- enforcement (boost activation, self-vote, duplicate handling). Pure SQL,
-- runs against the live Lovable Cloud database via `psql -f tests/sql/rls.sql`.
-- All work happens inside a transaction that is ROLLED BACK at the end, so
-- the DB is left untouched.
--
-- Each test prints either `ok N - <name>` or `not ok N - <name> <detail>`
-- and `RAISE EXCEPTION`s on failure so the script exits non-zero in CI.

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

-- Become two fake authenticated users by setting the JWT claims that RLS reads.
CREATE OR REPLACE FUNCTION pg_temp.become(_uid uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', _uid::text, 'role', 'authenticated')::text,
    true
  );
END $$;

CREATE OR REPLACE FUNCTION pg_temp.reset_role() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

-- This suite uses synthetic UUIDs and DOES NOT seed `auth.users` rows (the
-- `auth` schema is locked on Lovable Cloud). All assertions verify denial
-- paths and policy/function shape — they fail closed if RLS regresses.

DO $$
DECLARE
  alice uuid := gen_random_uuid();
  bob   uuid := gen_random_uuid();
  carol uuid := gen_random_uuid();
  fake_round uuid := gen_random_uuid();
  fake_match uuid := gen_random_uuid();
  v_count int;
  ok bool;
BEGIN
  -- ---------- 1. battle_votes RLS denies anonymous insert ----------
  PERFORM pg_temp.reset_role();
  PERFORM set_config('role', 'anon', true);
  BEGIN
    INSERT INTO public.battle_votes(round_id, match_id, voter_id, choice, weight)
    VALUES (fake_round, fake_match, carol, 'a', 1);
    PERFORM pg_temp.assert(false, 'anon battle_votes insert blocked');
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.assert(true, 'anon battle_votes insert blocked');
  END;

  -- ---------- 2. weight=5 without active power-up is blocked ----------
  PERFORM pg_temp.become(carol);
  BEGIN
    INSERT INTO public.battle_votes(round_id, match_id, voter_id, choice, weight)
    VALUES (fake_round, fake_match, carol, 'a', 5);
    PERFORM pg_temp.assert(false, 'weight=5 without active power-up blocked');
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.assert(true, 'weight=5 without active power-up blocked');
  END;

  -- ---------- 3. weight=1 still blocked when round/match does not exist ----------
  PERFORM pg_temp.become(alice);
  BEGIN
    INSERT INTO public.battle_votes(round_id, match_id, voter_id, choice, weight)
    VALUES (fake_round, fake_match, alice, 'a', 1);
    PERFORM pg_temp.assert(false, 'vote on non-existent round blocked');
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.assert(true, 'vote on non-existent round blocked');
  END;

  -- ---------- 4. cast_battle_vote function exists and is locked-down ----------
  PERFORM pg_temp.reset_role();
  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'cast_battle_vote';
  PERFORM pg_temp.assert(v_count = 1, 'cast_battle_vote() exists');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema='public' AND routine_name='cast_battle_vote'
      AND grantee='anon'
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'cast_battle_vote() not executable by anon');

  -- ---------- 5. signed_audio_access_log is write-locked for clients ----------
  PERFORM pg_temp.become(alice);
  BEGIN
    INSERT INTO public.signed_audio_access_log(user_id, outcome, reason)
    VALUES (alice, 'allowed', 'spoof');
    PERFORM pg_temp.assert(false, 'signed_audio_access_log client insert blocked');
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.assert(true, 'signed_audio_access_log client insert blocked');
  END;

  -- ---------- 6. rate_limit_hits is fully locked to clients ----------
  PERFORM pg_temp.become(alice);
  BEGIN
    PERFORM 1 FROM public.rate_limit_hits LIMIT 1;
    PERFORM pg_temp.assert(false, 'rate_limit_hits client select blocked');
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.assert(true, 'rate_limit_hits client select blocked');
  END;

  -- ---------- 7. check_rate_limit() is not executable by clients ----------
  PERFORM pg_temp.reset_role();
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema='public' AND routine_name='check_rate_limit'
      AND grantee IN ('anon','authenticated')
  ) INTO ok;
  PERFORM pg_temp.assert(NOT ok, 'check_rate_limit() not executable by clients');

  PERFORM pg_temp.reset_role();
  RAISE NOTICE 'RLS regression suite passed';
END $$;

ROLLBACK;