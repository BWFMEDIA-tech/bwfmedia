DROP POLICY IF EXISTS tournament_read ON public.battle_tournaments;
CREATE POLICY tournament_read ON public.battle_tournaments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));