DROP POLICY IF EXISTS play_tracks_audience_playing ON public.play_tracks;
REVOKE SELECT ON public.play_tracks FROM anon;