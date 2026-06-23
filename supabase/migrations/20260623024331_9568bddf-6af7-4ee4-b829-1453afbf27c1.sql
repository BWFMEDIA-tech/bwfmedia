
-- Restrict column-level SELECT on public.profiles so authenticated users
-- can no longer read `last_seen_at` of other users (privacy hardening).
-- Service role (used by server-side admin clients) retains full access.

REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, display_name, avatar_url, bio, created_at, updated_at,
  stage_name, genre, interests, banner_url, username, location,
  genres, member_since, featured_track_id, featured_video_id,
  public_id, brand_name, brand_avatar_url
) ON public.profiles TO authenticated;

-- Keep insert/update grants intact (column-level grants don't affect these,
-- but re-issue defensively in case future code paths need them).
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
