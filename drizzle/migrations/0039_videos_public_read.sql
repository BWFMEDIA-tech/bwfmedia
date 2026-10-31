GRANT SELECT ON public.videos TO anon;

CREATE POLICY "videos_public_read"
ON public.videos
FOR SELECT
TO anon
USING (true);