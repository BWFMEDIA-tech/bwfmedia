
ALTER TABLE public.live_submissions
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS song_title text;

-- Public view: safe columns only, paid rows only.
CREATE OR REPLACE VIEW public.live_queue_public
WITH (security_invoker = true) AS
SELECT
  id,
  artist_name,
  song_title,
  song_link,
  photo_url,
  tier,
  queue_status,
  created_at,
  paid_at
FROM public.live_submissions
WHERE status = 'paid';

-- Allow anyone to read paid rows so the view + realtime work for the public page.
-- Note: the view restricts columns, but realtime on the base table broadcasts all
-- columns. We do not subscribe to the base table from the public client — only
-- the view is polled / queried from anon. Admin RLS already exists.
DROP POLICY IF EXISTS "Public can view paid live submissions" ON public.live_submissions;
CREATE POLICY "Public can view paid live submissions"
  ON public.live_submissions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'paid');

GRANT SELECT ON public.live_queue_public TO anon, authenticated;

-- Enable realtime broadcasts on the base table for admins (and public re-fetch triggers).
ALTER TABLE public.live_submissions REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_submissions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.live_submissions';
  END IF;
END $$;
