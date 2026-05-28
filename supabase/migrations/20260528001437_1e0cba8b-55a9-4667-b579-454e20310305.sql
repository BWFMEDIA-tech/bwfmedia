
-- 1. Lock down artist-audio bucket
UPDATE storage.buckets SET public = false WHERE id = 'artist-audio';

DROP POLICY IF EXISTS "Admins can read artist audio" ON storage.objects;
CREATE POLICY "Admins can read artist audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'artist-audio' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update artist audio" ON storage.objects;
CREATE POLICY "Admins can update artist audio"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'artist-audio' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'artist-audio' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete artist audio" ON storage.objects;
CREATE POLICY "Admins can delete artist audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'artist-audio' AND public.has_role(auth.uid(), 'admin'));

-- 2. Stop streaming admin-only submissions over realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.live_submissions;

-- 3. Re-publish tips without Stripe identifier columns
ALTER PUBLICATION supabase_realtime DROP TABLE public.tips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tips
  (id, stream_id, user_id, amount_cents, message, display_name, status, created_at, paid_at);

-- 4. Default-deny on realtime.messages (private broadcast/presence channels)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all by default" ON realtime.messages;
CREATE POLICY "Deny all by default"
ON realtime.messages FOR SELECT TO authenticated
USING (false);
