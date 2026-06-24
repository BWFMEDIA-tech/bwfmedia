CREATE POLICY "live_submissions_delete_own_pending"
ON public.live_submissions
FOR DELETE
TO authenticated
USING (
  user_id IS NOT NULL
  AND user_id = auth.uid()
  AND status = 'pending'
  AND paid_at IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
);