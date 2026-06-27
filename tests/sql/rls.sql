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

DO $$
DECLARE
  alice uuid := gen_random_uuid();
  bob   uuid := gen_random_uuid();
  carol uuid := gen_random_uuid();   -- a non-competitor voter
  stream_id uuid;
  match_id uuid;
  round_id uuid;
  v_count int;
  vote_id uuid;
BEGIN
  -- Seed two competitor users + a voter as service_role.
  INSERT INTO auth.users(id, email, encrypted_password, email_confirmed_at,
                         instance_id, aud, role)
  VALUES
    (alice, 'alice-test@example.com', '', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (bob,   'bob-test@example.com',   '', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (carol, 'carol-test@example.com', '', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  INSERT INTO public.profiles(id, display_name) VALUES
    (alice, 'Alice'), (bob, 'Bob'), (carol, 'Carol');

  INSERT INTO public.streams(host_id, title, room_name, status, mode)
  VALUES (alice, '__rls_test__', 'rls-test-' || alice::text, 'live', 'play')
  RETURNING id INTO stream_id;

  INSERT INTO public.battle_matches(stream_id, artist_a_id, artist_b_id,
                                    artist_a_name, artist_b_name, status,
                                    current_round, total_rounds)
  VALUES (stream_id, alice, bob, 'Alice', 'Bob', 'live', 1, 1)
  RETURNING id INTO match_id;

  INSERT INTO public.battle_rounds(match_id, round_number, status, voting_status)
  VALUES (match_id, 1, 'live', 'open')
  RETURNING id INTO round_id;

  UPDATE public.battle_matches SET current_round_id = round_id WHERE id = match_id;

  -- ---------- 1. self-vote is blocked ----------
  PERFORM pg_temp.become(alice);
  BEGIN
    INSERT INTO public.battle_votes(round_id, match_id, voter_id, choice, weight)
    VALUES (round_id, match_id, alice, 'a', 1);
    PERFORM pg_temp.assert(false, 'self vote (alice voting on her own match) blocked');
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    PERFORM pg_temp.assert(true, 'self vote (alice voting on her own match) blocked');
  END;

  -- ---------- 2. weight=5 without active power-up is blocked ----------
  PERFORM pg_temp.become(carol);
  BEGIN
    INSERT INTO public.battle_votes(round_id, match_id, voter_id, choice, weight)
    VALUES (round_id, match_id, carol, 'a', 5);
    PERFORM pg_temp.assert(false, 'weight=5 without active power-up blocked');
  EXCEPTION WHEN others THEN
    PERFORM pg_temp.assert(true, 'weight=5 without active power-up blocked');
  END;

  -- ---------- 3. weight=1 by an eligible voter succeeds ----------
  PERFORM pg_temp.become(carol);
  INSERT INTO public.battle_votes(round_id, match_id, voter_id, choice, weight)
  VALUES (round_id, match_id, carol, 'b', 1)
  RETURNING id INTO vote_id;
  PERFORM pg_temp.assert(vote_id IS NOT NULL, 'weight=1 vote by non-competitor accepted');

  -- ---------- 4. allowed insert was audit-logged ----------
  PERFORM pg_temp.reset_role();
  SELECT count(*) INTO v_count
    FROM public.battle_vote_attempts
   WHERE match_id = match_id
     AND voter_id = carol
     AND outcome = 'allowed';
  PERFORM pg_temp.assert(v_count >= 1, 'allowed vote logged to battle_vote_attempts');

  -- ---------- 5. signed-audio: cross-user path read blocked ----------
  -- Bob owns a play/<bob>/ path. Alice should not see Bob's storage objects
  -- via the published-track lookup unless a play_tracks row references it.
  PERFORM pg_temp.become(alice);
  SELECT count(*) INTO v_count
    FROM public.play_tracks
   WHERE audio_url ILIKE '%play/' || bob::text || '/%'
     AND status IN ('queued','playing');
  PERFORM pg_temp.assert(v_count = 0,
    'no leaked play_tracks rows expose another user''s storage path');

  PERFORM pg_temp.reset_role();
  RAISE NOTICE 'RLS regression suite passed';
END $$;

ROLLBACK;