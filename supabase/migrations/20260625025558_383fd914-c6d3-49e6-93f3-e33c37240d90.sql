REVOKE SELECT (interests) ON public.profiles FROM authenticated;
REVOKE SELECT (interests) ON public.profiles FROM anon;
GRANT SELECT (interests) ON public.profiles TO service_role;