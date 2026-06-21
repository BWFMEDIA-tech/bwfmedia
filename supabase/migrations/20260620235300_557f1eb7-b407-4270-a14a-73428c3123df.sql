
-- Dedupe historical battle_votes: keep earliest per (match_id, voter_id)
DELETE FROM public.battle_votes bv
USING (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY match_id, voter_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.battle_votes
) ranked
WHERE bv.id = ranked.id AND ranked.rn > 1;

-- One vote per BATTLE per voter
CREATE UNIQUE INDEX IF NOT EXISTS battle_votes_one_per_match_voter
  ON public.battle_votes (match_id, voter_id);

-- Strict insert policy
DROP POLICY IF EXISTS "battle_votes_insert_self_live_round" ON public.battle_votes;
CREATE POLICY "battle_votes_insert_strict" ON public.battle_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND weight = 1
    AND EXISTS (
      SELECT 1
      FROM public.battle_rounds r
      JOIN public.battle_matches m ON m.id = r.match_id
      WHERE r.id = battle_votes.round_id
        AND r.match_id = battle_votes.match_id
        AND r.status = 'live'
        AND m.status = 'live'
        AND auth.uid() <> m.artist_a_id
        AND auth.uid() <> m.artist_b_id
    )
  );
-- (no UPDATE/DELETE policies => clients cannot edit/delete votes)

-- play_votes: block self-vote on own track
DROP POLICY IF EXISTS "play_votes self insert" ON public.play_votes;
DROP POLICY IF EXISTS "play_votes self update" ON public.play_votes;

CREATE POLICY "play_votes self insert" ON public.play_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND value IN (-1, 1)
    AND NOT EXISTS (
      SELECT 1 FROM public.play_tracks t
      WHERE t.id = play_votes.track_id AND t.artist_user_id = auth.uid()
    )
  );

CREATE POLICY "play_votes self update" ON public.play_votes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND value IN (-1, 1)
    AND NOT EXISTS (
      SELECT 1 FROM public.play_tracks t
      WHERE t.id = play_votes.track_id AND t.artist_user_id = auth.uid()
    )
  );

-- arena_playback_state guard trigger (host-only + stamps updated_by)
CREATE OR REPLACE FUNCTION public.arena_playback_state_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NOT public.is_stream_host(auth.uid(), NEW.stream_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only the room host can change playback state';
  END IF;
  NEW.updated_by := auth.uid();
  NEW.last_sync_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS arena_playback_state_guard_ins ON public.arena_playback_state;
DROP TRIGGER IF EXISTS arena_playback_state_guard_upd ON public.arena_playback_state;
CREATE TRIGGER arena_playback_state_guard_ins
  BEFORE INSERT ON public.arena_playback_state
  FOR EACH ROW EXECUTE FUNCTION public.arena_playback_state_guard();
CREATE TRIGGER arena_playback_state_guard_upd
  BEFORE UPDATE ON public.arena_playback_state
  FOR EACH ROW EXECUTE FUNCTION public.arena_playback_state_guard();
