-- PROFILES: tighten column-level grants and replace USING(true) policy

REVOKE SELECT ON public.profiles FROM anon, authenticated, PUBLIC;

GRANT SELECT (
  id, display_name, avatar_url, banner_url, stage_name,
  genre, genres, username, member_since,
  featured_track_id, featured_video_id, public_id,
  brand_name, brand_avatar_url, created_at, updated_at
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS authenticated_users_can_read_profiles ON public.profiles;

CREATE POLICY profiles_select_public_columns
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- AVATARS: drop existing avatar SELECT policies, recreate as authenticated-only
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND pg_get_expr(polqual, polrelid) ILIKE '%avatars%'
      AND polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can read avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');
