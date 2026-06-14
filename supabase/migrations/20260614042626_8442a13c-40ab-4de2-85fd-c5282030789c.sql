
GRANT SELECT (audio_url) ON public.play_tracks TO authenticated;
GRANT SELECT (audio_url) ON public.play_tracks TO anon;
GRANT SELECT (last_seen_at, interests, location) ON public.profiles TO authenticated;
GRANT SELECT (last_seen_at, interests, location) ON public.profiles TO anon;
