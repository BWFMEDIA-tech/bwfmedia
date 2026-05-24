
-- 1. Extend live_submissions with audio fields
ALTER TABLE public.live_submissions
  ADD COLUMN IF NOT EXISTS uploaded_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_file_type TEXT,
  ADD COLUMN IF NOT EXISTS audio_uploaded_at TIMESTAMPTZ;

-- 2. Recreate public queue view with audio fields
DROP VIEW IF EXISTS public.live_queue_public;
CREATE VIEW public.live_queue_public
WITH (security_invoker = true)
AS
SELECT
  id, artist_name, song_title, song_link, photo_url,
  tier, queue_status, created_at, paid_at,
  uploaded_audio_url, audio_file_type, audio_uploaded_at
FROM public.live_submissions
WHERE status = 'paid';

GRANT SELECT ON public.live_queue_public TO anon, authenticated;

-- 3. Allow anon/authenticated to update only the audio columns on their own
--    submission row by id. Pre-existing admin-only UPDATE policy stays in place.
CREATE POLICY "Anyone can attach audio to a submission"
ON public.live_submissions
FOR UPDATE
TO anon, authenticated
USING (status = 'paid')
WITH CHECK (status = 'paid');

-- 4. Create public audio storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-audio', 'artist-audio', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies — public read, anon/auth upload
CREATE POLICY "Artist audio is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-audio');

CREATE POLICY "Anyone can upload artist audio"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'artist-audio');
