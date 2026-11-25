GRANT SELECT ON public.battle_matches TO anon;
CREATE POLICY battle_matches_public_display ON public.battle_matches FOR SELECT TO anon USING(status IN ('live','completed'));
CREATE OR REPLACE FUNCTION public.battle_vote_target_artist(_match_id uuid,_choice text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN _choice='a' THEN m.artist_a_id WHEN _choice='b' THEN m.artist_b_id ELSE NULL END
 FROM public.battle_matches m WHERE m.id=_match_id AND (m.status IN ('live','completed') OR auth.uid() IN(m.host_id,m.artist_a_id,m.artist_b_id) OR public.has_role(auth.uid(),'admin'))
$$;