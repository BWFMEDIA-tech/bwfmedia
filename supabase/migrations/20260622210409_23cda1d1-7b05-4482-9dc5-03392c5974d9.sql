-- Allow artists to vote exactly once on their own track.
-- Insert: permitted (unique constraint on (track_id, user_id) enforces "one time").
-- Update/Delete: still blocked for the track's own artist so the vote can't be changed or removed.

DROP POLICY IF EXISTS "play_votes self insert" ON public.play_votes;
DROP POLICY IF EXISTS "play_votes self update" ON public.play_votes;
DROP POLICY IF EXISTS "play_votes self delete" ON public.play_votes;

CREATE POLICY "play_votes self insert" ON public.play_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND value IN (-1, 1)
  );

CREATE POLICY "play_votes self update" ON public.play_votes
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.play_tracks t
      WHERE t.id = play_votes.track_id AND t.artist_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND value IN (-1, 1)
    AND NOT EXISTS (
      SELECT 1 FROM public.play_tracks t
      WHERE t.id = play_votes.track_id AND t.artist_user_id = auth.uid()
    )
  );

CREATE POLICY "play_votes self delete" ON public.play_votes
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.play_tracks t
      WHERE t.id = play_votes.track_id AND t.artist_user_id = auth.uid()
    )
  );