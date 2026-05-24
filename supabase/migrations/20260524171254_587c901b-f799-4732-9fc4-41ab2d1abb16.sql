
DROP POLICY IF EXISTS "Anyone can attach audio to a submission" ON public.live_submissions;
DROP POLICY IF EXISTS "Artist audio is publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload artist audio" ON storage.objects;

CREATE POLICY "Anyone can upload artist audio to artists folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'artist-audio'
  AND (storage.foldername(name))[1] = 'artists'
);
