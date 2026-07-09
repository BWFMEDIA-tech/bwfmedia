
-- Allow authenticated users to read only the safe, public-facing columns of profiles.
-- The public_profiles view (security_invoker) already restricts columns; this grants
-- column-level SELECT privileges + a row-level policy so cross-user reads through the
-- view succeed without exposing sensitive fields (email, phone, etc.).

GRANT SELECT (id, public_id, display_name, username, stage_name, avatar_url, banner_url, bio, genre, genres, member_since, featured_track_id, featured_video_id, brand_name, brand_avatar_url, created_at)
  ON public.profiles TO authenticated;

GRANT SELECT (id, public_id, display_name, username, stage_name, avatar_url, banner_url, bio, genre, genres, member_since, featured_track_id, featured_video_id, brand_name, brand_avatar_url, created_at)
  ON public.profiles TO anon;

DROP POLICY IF EXISTS profiles_authenticated_safe_columns_read ON public.profiles;
CREATE POLICY profiles_authenticated_safe_columns_read
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS profiles_anon_safe_columns_read ON public.profiles;
CREATE POLICY profiles_anon_safe_columns_read
  ON public.profiles FOR SELECT TO anon
  USING (true);
