
-- 1. Remove anon/auth INSERT on artist-audio bucket
DROP POLICY IF EXISTS "Anyone can upload artist audio to artists folder" ON storage.objects;

CREATE POLICY "Admins can upload artist audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artist-audio'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2. Restrict user_bans visibility
DROP POLICY IF EXISTS "Anyone signed in can see active bans" ON public.user_bans;

CREATE POLICY "Users can see their own active ban"
ON public.user_bans
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND (expires_at IS NULL OR expires_at > now())
);

CREATE POLICY "Admins and moderators can view all bans"
ON public.user_bans
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);
