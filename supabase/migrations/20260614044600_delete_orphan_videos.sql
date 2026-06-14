-- Delete video DB rows whose storage object no longer exists in the videos bucket.
DELETE FROM public.videos v
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects o
  WHERE o.bucket_id = 'videos' AND o.name = v.storage_path
);
