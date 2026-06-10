DROP POLICY IF EXISTS "play_tracks select all" ON public.play_tracks;
CREATE POLICY "play_tracks select authenticated" ON public.play_tracks FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.play_tracks FROM anon;

DROP POLICY IF EXISTS "play_votes select all" ON public.play_votes;
CREATE POLICY "play_votes select authenticated" ON public.play_votes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.play_votes FROM anon;