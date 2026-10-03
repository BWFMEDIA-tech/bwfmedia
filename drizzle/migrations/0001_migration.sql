DROP POLICY IF EXISTS "Anyone can view follows" ON public.artist_follows;
CREATE POLICY "artist_follows_signed_in_read" ON public.artist_follows FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.artist_follows FROM anon;

DROP POLICY IF EXISTS "artist_vote_rollups_authenticated_read" ON public.artist_vote_rollups;
CREATE POLICY "artist_vote_rollups_signed_in_read" ON public.artist_vote_rollups FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "artist_vote_totals_authenticated_read" ON public.artist_vote_totals;
CREATE POLICY "artist_vote_totals_signed_in_read" ON public.artist_vote_totals FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "battle_matches_read_all" ON public.battle_matches;
CREATE POLICY "battle_matches_signed_in_read" ON public.battle_matches FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.battle_matches FROM anon;

DROP POLICY IF EXISTS "battle_rounds_read_all" ON public.battle_rounds;
CREATE POLICY "battle_rounds_signed_in_read" ON public.battle_rounds FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.battle_rounds FROM anon;

DROP POLICY IF EXISTS "Anyone can view broadcasts" ON public.broadcasts;
CREATE POLICY "broadcasts_signed_in_read" ON public.broadcasts FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.broadcasts FROM anon;

DROP POLICY IF EXISTS "labels public read" ON public.labels;
CREATE POLICY "labels_signed_in_read" ON public.labels FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.labels FROM anon;

DROP POLICY IF EXISTS "Anyone can view podcast state" ON public.podcast_state;
CREATE POLICY "podcast_state_signed_in_read" ON public.podcast_state FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.podcast_state FROM anon;

DROP POLICY IF EXISTS "Streams viewable by everyone" ON public.streams;
CREATE POLICY "streams_signed_in_read" ON public.streams FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.streams FROM anon;

DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
CREATE POLICY "videos_signed_in_read" ON public.videos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.videos FROM anon;