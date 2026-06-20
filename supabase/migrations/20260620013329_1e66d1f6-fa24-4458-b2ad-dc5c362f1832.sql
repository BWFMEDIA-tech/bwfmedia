DROP POLICY IF EXISTS "Anyone can view stage rooms" ON public.stage_rooms;
REVOKE SELECT ON public.stage_rooms FROM anon;
CREATE POLICY "Authenticated users can view stage rooms" ON public.stage_rooms FOR SELECT TO authenticated USING (true);