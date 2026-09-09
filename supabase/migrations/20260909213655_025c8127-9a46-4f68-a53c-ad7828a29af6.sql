DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can read videos bucket') THEN
    CREATE POLICY "Anyone can read videos bucket" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'videos');
  END IF;
END $$;