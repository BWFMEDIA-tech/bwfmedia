
-- 1. Admin-only SELECT on deck_leads
CREATE POLICY "Admins can view deck leads"
ON public.deck_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Owner-scoped UPDATE on videos storage bucket
CREATE POLICY "Users can update own files in videos bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING ((bucket_id = 'videos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))
WITH CHECK ((bucket_id = 'videos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));

-- 3. Prevent listing all files in the public videos bucket via API.
-- Public file access via getPublicUrl continues to work (bucket is public).
DROP POLICY IF EXISTS "Public can view videos bucket" ON storage.objects;

-- 4. Lock down pgmq helper SECURITY DEFINER functions: pin search_path,
--    and revoke EXECUTE from anon / authenticated. Only service_role
--    (used by server-side code) should call them.
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
