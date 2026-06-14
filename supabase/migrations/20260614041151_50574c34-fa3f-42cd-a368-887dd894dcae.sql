DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT
  public_id,
  display_name AS username,
  display_name,
  avatar_url,
  bio,
  genre,
  location AS city,
  created_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;