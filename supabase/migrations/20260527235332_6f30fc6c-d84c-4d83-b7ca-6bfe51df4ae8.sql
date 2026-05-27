
INSERT INTO storage.buckets (id, name, public)
VALUES ('stream-recordings', 'stream-recordings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Recordings are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'stream-recordings');

CREATE POLICY "Hosts can upload their own recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stream-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hosts can update their own recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stream-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Hosts can delete their own recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stream-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
