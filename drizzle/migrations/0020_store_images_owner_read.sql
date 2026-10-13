DROP POLICY IF EXISTS "Store images public read" ON storage.objects;

CREATE POLICY "Store images owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'store-products' AND (storage.foldername(name))[1] = auth.uid()::text);