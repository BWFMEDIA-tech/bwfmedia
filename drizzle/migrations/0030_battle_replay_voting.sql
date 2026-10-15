ALTER TABLE public.battle_matches
  ADD COLUMN IF NOT EXISTS replay_voting_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS replay_a_votes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replay_b_votes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replay_result text,
  ADD COLUMN IF NOT EXISTS replay_finalized_at timestamptz;

CREATE TABLE public.battle_replay_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL,
  choice text NOT NULL CHECK (choice IN ('a','b')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, voter_id)
);
GRANT SELECT ON public.battle_replay_votes TO authenticated;
GRANT ALL ON public.battle_replay_votes TO service_role;
ALTER TABLE public.battle_replay_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replay vote read" ON public.battle_replay_votes FOR SELECT TO authenticated USING (voter_id = auth.uid());

-- Open the 24h window on completion; block client edits of replay fields.
CREATE OR REPLACE FUNCTION public.battle_matches_replay_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.replay_write', true), '') <> '1' THEN
    IF NEW.replay_a_votes IS DISTINCT FROM OLD.replay_a_votes
       OR NEW.replay_b_votes IS DISTINCT FROM OLD.replay_b_votes
       OR NEW.replay_result IS DISTINCT FROM OLD.replay_result
       OR NEW.replay_finalized_at IS DISTINCT FROM OLD.replay_finalized_at
       OR (NEW.replay_voting_ends_at IS DISTINCT FROM OLD.replay_voting_ends_at
           AND NOT (OLD.status <> 'completed' AND NEW.status = 'completed')) THEN
      RAISE EXCEPTION 'replay voting fields are server-managed';
    END IF;
  END IF;
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.replay_voting_ends_at IS NULL THEN
    NEW.replay_voting_ends_at := coalesce(NEW.ended_at, now()) + interval '24 hours';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER battle_matches_replay_guard BEFORE UPDATE ON public.battle_matches
  FOR EACH ROW EXECUTE FUNCTION public.battle_matches_replay_guard();

CREATE OR REPLACE FUNCTION public.finalize_battle_replays()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; n integer := 0; res text; wname text;
BEGIN
  PERFORM set_config('app.replay_write', '1', true);
  FOR m IN SELECT * FROM battle_matches
    WHERE status = 'completed' AND replay_finalized_at IS NULL
      AND replay_voting_ends_at IS NOT NULL AND replay_voting_ends_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT count(*) FILTER (WHERE choice='a'), count(*) FILTER (WHERE choice='b')
      INTO m.replay_a_votes, m.replay_b_votes FROM battle_replay_votes WHERE match_id = m.id;
    res := CASE WHEN m.replay_a_votes > m.replay_b_votes THEN 'a'
                WHEN m.replay_b_votes > m.replay_a_votes THEN 'b' ELSE 'tie' END;
    UPDATE battle_matches SET replay_a_votes = m.replay_a_votes, replay_b_votes = m.replay_b_votes,
      replay_result = res, replay_finalized_at = now() WHERE id = m.id;
    wname := CASE res WHEN 'a' THEN coalesce(m.artist_a_name,'Artist A')
                      WHEN 'b' THEN coalesce(m.artist_b_name,'Artist B') END;
    INSERT INTO notifications (user_id, type, title, body, stream_id)
    SELECT DISTINCT u, 'battle_result',
      CASE WHEN res='tie' THEN 'Battle ended in a tie' ELSE wname || ' won the battle' END,
      'Final replay vote: ' || m.replay_a_votes || ' – ' || m.replay_b_votes, m.stream_id
    FROM unnest(ARRAY[m.artist_a_id, m.artist_b_id, m.host_id]) u WHERE u IS NOT NULL;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.finalize_battle_replays() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cast_replay_vote(_match_id uuid, _choice text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); m record; ins integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'sign in to vote'; END IF;
  IF _choice NOT IN ('a','b') THEN RAISE EXCEPTION 'invalid choice'; END IF;
  SELECT * INTO m FROM battle_matches WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND OR m.status <> 'completed' THEN RAISE EXCEPTION 'voting is not open'; END IF;
  IF m.replay_finalized_at IS NOT NULL OR m.replay_voting_ends_at IS NULL OR m.replay_voting_ends_at <= now() THEN
    RAISE EXCEPTION 'voting has closed';
  END IF;
  INSERT INTO battle_replay_votes (match_id, voter_id, choice) VALUES (_match_id, uid, _choice)
    ON CONFLICT (match_id, voter_id) DO NOTHING;
  GET DIAGNOSTICS ins = ROW_COUNT;
  IF ins = 1 THEN
    PERFORM set_config('app.replay_write', '1', true);
    UPDATE battle_matches SET
      replay_a_votes = replay_a_votes + (CASE WHEN _choice='a' THEN 1 ELSE 0 END),
      replay_b_votes = replay_b_votes + (CASE WHEN _choice='b' THEN 1 ELSE 0 END)
    WHERE id = _match_id;
  END IF;
  RETURN jsonb_build_object('duplicate', ins = 0,
    'my_choice', (SELECT choice FROM battle_replay_votes WHERE match_id=_match_id AND voter_id=uid));
END $$;
REVOKE ALL ON FUNCTION public.cast_replay_vote(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cast_replay_vote(uuid, text) TO authenticated;

-- Public-safe replay payload: songs, recording (if any), totals, status.
CREATE OR REPLACE FUNCTION public.get_battle_replay(_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; rec text; tracks jsonb;
BEGIN
  SELECT * INTO m FROM battle_matches WHERE id = _match_id AND status = 'completed';
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'artist_name',t.artist_name,
      'artist_user_id',t.artist_user_id,'audio_url',t.audio_url,'cover_url',t.cover_url,'side',t.side)), '[]'::jsonb)
  INTO tracks FROM (
    SELECT DISTINCT ON (pt.id) pt.*, CASE WHEN pt.id = r.a_playing_track_id OR pt.artist_user_id = m.artist_a_id THEN 'a' ELSE 'b' END side
    FROM battle_rounds r JOIN play_tracks pt ON pt.id IN (r.a_playing_track_id, r.b_playing_track_id)
    WHERE r.match_id = m.id AND pt.audio_url IS NOT NULL
  ) t;
  SELECT public_url INTO rec FROM stream_recordings
    WHERE stream_id = m.stream_id AND status = 'ready' AND public_url IS NOT NULL
      AND created_at BETWEEN coalesce(m.started_at, m.created_at) - interval '5 minutes' AND coalesce(m.ended_at, now()) + interval '2 hours'
    ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object('id',m.id,'stream_id',m.stream_id,'artist_a_id',m.artist_a_id,'artist_b_id',m.artist_b_id,
    'artist_a_name',m.artist_a_name,'artist_b_name',m.artist_b_name,'ended_at',m.ended_at,
    'voting_ends_at',m.replay_voting_ends_at,'a_votes',m.replay_a_votes,'b_votes',m.replay_b_votes,
    'result',m.replay_result,'finalized_at',m.replay_finalized_at,'tracks',tracks,'recording_url',rec,
    'my_choice',(SELECT choice FROM battle_replay_votes WHERE match_id=m.id AND voter_id=auth.uid()),
    'server_now', now());
END $$;
GRANT EXECUTE ON FUNCTION public.get_battle_replay(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_recent_battle_replays(_stream_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM battle_matches WHERE stream_id = _stream_id AND status = 'completed'
    AND coalesce(replay_finalized_at, now()) > now() - interval '7 days'
  ORDER BY ended_at DESC NULLS LAST LIMIT 3
$$;
GRANT EXECUTE ON FUNCTION public.list_recent_battle_replays(uuid) TO anon, authenticated;