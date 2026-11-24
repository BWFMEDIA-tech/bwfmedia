DROP POLICY IF EXISTS artist_follows_signed_in_read ON public.artist_follows;
CREATE POLICY artist_follows_scoped_read ON public.artist_follows FOR SELECT TO authenticated
USING (follower_id = auth.uid() OR artist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS streams_signed_in_read ON public.streams;
CREATE POLICY streams_scoped_read ON public.streams FOR SELECT TO authenticated
USING (status IN ('live','idle','scheduled') OR host_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.stream_moderators m WHERE m.stream_id = streams.id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS broadcasts_signed_in_read ON public.broadcasts;
CREATE POLICY broadcasts_scoped_read ON public.broadcasts FOR SELECT TO authenticated
USING (stream_status IN ('live','scheduled') OR host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS podcast_state_signed_in_read ON public.podcast_state;
CREATE POLICY podcast_state_scoped_read ON public.podcast_state FOR SELECT TO authenticated
USING (session_live = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS battle_matches_signed_in_read ON public.battle_matches;
CREATE POLICY battle_matches_scoped_read ON public.battle_matches FOR SELECT TO authenticated
USING (status IN ('live','completed') OR host_id = auth.uid() OR artist_a_id = auth.uid() OR artist_b_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS battle_rounds_signed_in_read ON public.battle_rounds;
CREATE POLICY battle_rounds_scoped_read ON public.battle_rounds FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.battle_matches bm WHERE bm.id = battle_rounds.match_id));

DROP POLICY IF EXISTS battle_scores_signed_in_read ON public.battle_scores;
CREATE POLICY battle_scores_scoped_read ON public.battle_scores FOR SELECT TO authenticated
USING (artist_id = auth.uid() OR EXISTS (SELECT 1 FROM public.battle_matches bm WHERE bm.id = battle_scores.battle_id));

DROP POLICY IF EXISTS artist_vote_totals_signed_in_read ON public.artist_vote_totals;
CREATE POLICY artist_vote_totals_scoped_read ON public.artist_vote_totals FOR SELECT TO authenticated
USING (artist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS artist_vote_rollups_signed_in_read ON public.artist_vote_rollups;
CREATE POLICY artist_vote_rollups_scoped_read ON public.artist_vote_rollups FOR SELECT TO authenticated
USING (artist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.get_artist_follower_count(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_artist_following_count(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_artist_follower_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_artist_following_count(uuid) TO authenticated, service_role;