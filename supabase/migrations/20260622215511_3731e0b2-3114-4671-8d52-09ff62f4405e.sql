CREATE POLICY "play_tracks audience playing" ON public.play_tracks
  FOR SELECT TO anon
  USING (
    status = 'playing'
    AND EXISTS (
      SELECT 1 FROM public.streams s
      WHERE s.id = play_tracks.stream_id AND s.status = 'live'
    )
  );