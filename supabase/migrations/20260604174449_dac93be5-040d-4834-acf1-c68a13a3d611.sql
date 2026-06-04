-- Restrict live_submissions inserts to authenticated users whose JWT email matches the row.
DROP POLICY IF EXISTS "live_submissions_insert" ON public.live_submissions;

CREATE POLICY "live_submissions_insert_authenticated"
ON public.live_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND queue_status = 'queued'
  AND uploaded_audio_url IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
  AND paid_at IS NULL
  AND audio_uploaded_at IS NULL
  AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);