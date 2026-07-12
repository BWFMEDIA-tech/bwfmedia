
-- 1. Profiles: drop broad USING(true) SELECT policies. Public consumers must use the public_profiles view.
DROP POLICY IF EXISTS "profiles_anon_safe_columns_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_safe_columns_read" ON public.profiles;

-- Revoke direct anon/authenticated SELECT on profiles table columns; owner policy + view remain.
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated; -- owner policy narrows to auth.uid()=id
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Artist vote aggregate tables: authenticated-only reads, remove from realtime.
DROP POLICY IF EXISTS "artist_vote_totals_public_read" ON public.artist_vote_totals;
DROP POLICY IF EXISTS "artist_vote_rollups_public_read" ON public.artist_vote_rollups;

CREATE POLICY "artist_vote_totals_authenticated_read"
  ON public.artist_vote_totals FOR SELECT TO authenticated USING (true);

CREATE POLICY "artist_vote_rollups_authenticated_read"
  ON public.artist_vote_rollups FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.artist_vote_totals FROM anon;
REVOKE SELECT ON public.artist_vote_rollups FROM anon;
GRANT SELECT ON public.artist_vote_totals TO authenticated;
GRANT SELECT ON public.artist_vote_rollups TO authenticated;

-- Remove from realtime publication (safe if not present).
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.artist_vote_totals;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.artist_vote_rollups;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
