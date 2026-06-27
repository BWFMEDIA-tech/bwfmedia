DROP POLICY IF EXISTS "play_votes self update" ON public.play_votes;
DROP POLICY IF EXISTS "play_votes self delete" ON public.play_votes;

CREATE POLICY "play_votes self update"
  ON public.play_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND value = ANY (ARRAY[-1, 1]));

CREATE POLICY "play_votes self delete"
  ON public.play_votes FOR DELETE
  USING (user_id = auth.uid());