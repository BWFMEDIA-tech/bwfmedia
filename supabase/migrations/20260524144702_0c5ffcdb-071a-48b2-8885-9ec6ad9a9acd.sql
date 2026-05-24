-- Remove public SELECT policy on live_submissions to prevent exposure of
-- submitter emails and Stripe payment metadata. Public reads should go
-- through the safe `public.live_queue_public` view which excludes PII.
DROP POLICY IF EXISTS "Public can read paid live submissions" ON public.live_submissions;