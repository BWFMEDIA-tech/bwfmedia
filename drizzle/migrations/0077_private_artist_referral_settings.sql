DROP POLICY IF EXISTS "Anyone reads referral settings" ON public.artist_referral_settings;
REVOKE SELECT ON public.artist_referral_settings FROM anon;
GRANT SELECT ON public.artist_referral_settings TO authenticated;
GRANT ALL ON public.artist_referral_settings TO service_role;
CREATE POLICY artist_referral_settings_admin_read ON public.artist_referral_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.get_my_artist_referral_settings() RETURNS TABLE(percentage numeric, enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT s.percentage, s.enabled FROM public.artist_referral_settings s WHERE auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin')); $$;
REVOKE ALL ON FUNCTION public.get_my_artist_referral_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_artist_referral_settings() TO authenticated, service_role;