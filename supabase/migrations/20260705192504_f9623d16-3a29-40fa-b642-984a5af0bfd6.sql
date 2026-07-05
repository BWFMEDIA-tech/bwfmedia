
-- Lock down profiles table to owner-only reads; route all cross-user reads
-- through the sanitized public_profiles view.

DROP POLICY IF EXISTS "profiles_public_columns_read" ON public.profiles;

-- Recreate public_profiles view with the full set of columns needed for
-- cross-user display. Runs with definer rights so anon/authenticated can
-- read despite the owner-only RLS on profiles.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT
  id,
  public_id,
  display_name,
  username,
  stage_name,
  avatar_url,
  banner_url,
  bio,
  genre,
  genres,
  member_since,
  featured_track_id,
  featured_video_id,
  brand_name,
  brand_avatar_url,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
