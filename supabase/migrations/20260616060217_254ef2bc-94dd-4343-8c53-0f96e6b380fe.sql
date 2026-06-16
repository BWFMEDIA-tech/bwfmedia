
DROP POLICY IF EXISTS "live_submissions_update_own" ON public.live_submissions;
CREATE POLICY "live_submissions_update_own"
  ON public.live_submissions
  FOR UPDATE
  TO authenticated
  USING (
    user_id IS NOT NULL
    AND user_id = auth.uid()
    AND status = 'pending'
    AND paid_at IS NULL
  )
  WITH CHECK (
    user_id IS NOT NULL
    AND user_id = auth.uid()
    AND status = 'pending'
    AND paid_at IS NULL
    AND stripe_session_id IS NULL
    AND stripe_payment_intent_id IS NULL
  );
