DROP POLICY IF EXISTS "Anyone can view submissions" ON public.play_arena_submissions;

CREATE POLICY "Artist host or admin can view submissions"
  ON public.play_arena_submissions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = artist_id
    OR public.is_stream_host(auth.uid(), arena_id)
    OR public.has_role(auth.uid(), 'admin')
  );