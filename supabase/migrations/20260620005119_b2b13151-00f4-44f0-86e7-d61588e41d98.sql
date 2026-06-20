GRANT SELECT, INSERT, UPDATE, DELETE ON public.play_tracks TO authenticated;
GRANT ALL ON public.play_tracks TO service_role;
GRANT SELECT ON public.play_tracks TO anon;