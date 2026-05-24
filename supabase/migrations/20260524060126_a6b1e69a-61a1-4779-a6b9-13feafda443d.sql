
-- Drop the overly broad public SELECT policy on the base table.
DROP POLICY IF EXISTS "Public can view paid live submissions" ON public.live_submissions;

-- Recreate the view as security_definer (default behavior) so the view filters
-- both columns AND rows, and anon only needs SELECT on the view.
DROP VIEW IF EXISTS public.live_queue_public;
CREATE VIEW public.live_queue_public AS
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
