DROP POLICY IF EXISTS mm_pool_select_all_auth ON public.matchmaking_pool;
CREATE POLICY mm_pool_select_self_or_admin ON public.matchmaking_pool
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));