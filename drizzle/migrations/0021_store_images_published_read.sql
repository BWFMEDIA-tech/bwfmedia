CREATE POLICY "Store images published read" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'store-products'
    AND EXISTS (
      SELECT 1 FROM public.store_products sp
      WHERE sp.status = 'published'
        AND storage.objects.name = ANY (sp.image_urls)
    )
  );