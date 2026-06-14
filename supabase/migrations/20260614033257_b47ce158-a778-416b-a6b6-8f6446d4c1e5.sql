DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "authenticated_users_can_read_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);