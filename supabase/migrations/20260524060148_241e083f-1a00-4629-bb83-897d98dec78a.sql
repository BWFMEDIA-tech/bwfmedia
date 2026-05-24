
-- Recreate view with security_invoker so it enforces caller's RLS,
-- then grant column-level SELECT for safe columns only on the base table.
DROP VIEW IF EXISTS public.live_queue_public;
CREATE VIEW public.live_queue_public
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

GRANT SELECT ON public.live_queue_public TO anon, authenticated;

-- Public can read only safe columns of paid rows on the base table.
-- Column-level grants restrict what anon can SELECT; RLS gates which rows.
REVOKE SELECT ON public.live_submissions FROM anon;
GRANT SELECT
  (id, artist_name, song_title, song_link, photo_url, tier, queue_status, created_at, paid_at)
  ON public.live_submissions TO anon, authenticated;

CREATE POLICY "Public can read paid live submissions"
  ON public.live_submissions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'paid');
