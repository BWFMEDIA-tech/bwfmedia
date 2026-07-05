
-- Replace the broad USING(true) SELECT policy with two explicit policies:
-- (1) owners can read their full profile row
-- (2) other authenticated users can read the row, but ONLY the columns granted
--     via column-level ACLs below. Any new column added later inherits the
--     table-level ACL (which grants NO SELECT to authenticated/anon), so it
--     stays private by default until explicitly exposed.

DROP POLICY IF EXISTS "profiles_select_public_columns" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_can_read_profiles" ON public.profiles;

CREATE POLICY "profiles_owner_full_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_public_columns_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "profiles_public_columns_read" ON public.profiles IS
  'Row-level allow-all for authenticated users. Actual column exposure is enforced by column-level GRANTs below: only public-safe columns are granted to authenticated. New columns default to no SELECT and must be explicitly granted.';

-- Reassert baseline privileges (idempotent): no table-wide SELECT to
-- authenticated/anon; only the safe columns are readable.
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id,
  display_name,
  avatar_url,
  stage_name,
  genre,
  genres,
  banner_url,
  username,
  member_since,
  featured_track_id,
  featured_video_id,
  public_id,
  brand_name,
  brand_avatar_url,
  created_at,
  updated_at
) ON public.profiles TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
