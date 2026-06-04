DROP POLICY IF EXISTS "Authenticated users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;

CREATE POLICY "Artists or admins can insert own videos"
ON public.videos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (public.has_role(auth.uid(), 'artist'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Artists or admins can update own videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND (public.has_role(auth.uid(), 'artist'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  auth.uid() = user_id
  AND (public.has_role(auth.uid(), 'artist'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Artists or admins can delete own videos"
ON public.videos
FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id AND (public.has_role(auth.uid(), 'artist'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);