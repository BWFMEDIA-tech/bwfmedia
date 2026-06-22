-- 1) battle_vote_attempts: belt-and-suspenders — explicitly deny all client writes.
--    Inserts are only valid via SECURITY DEFINER functions / triggers running as
--    the table owner; revoking and adding restrictive policies makes intent explicit.
REVOKE INSERT, UPDATE, DELETE ON public.battle_vote_attempts FROM anon, authenticated;

DROP POLICY IF EXISTS "battle_vote_attempts_no_client_insert" ON public.battle_vote_attempts;
CREATE POLICY "battle_vote_attempts_no_client_insert"
  ON public.battle_vote_attempts
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "battle_vote_attempts_no_client_update" ON public.battle_vote_attempts;
CREATE POLICY "battle_vote_attempts_no_client_update"
  ON public.battle_vote_attempts
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "battle_vote_attempts_no_client_delete" ON public.battle_vote_attempts;
CREATE POLICY "battle_vote_attempts_no_client_delete"
  ON public.battle_vote_attempts
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- 2) live_submissions: pin the insert policy to authenticated role explicitly,
--    so anonymous visitors can never create a submission row carrying an email.
DROP POLICY IF EXISTS "live_submissions_insert_authenticated" ON public.live_submissions;
CREATE POLICY "live_submissions_insert_authenticated"
  ON public.live_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND queue_status = 'queued'
    AND uploaded_audio_url IS NULL
    AND stripe_session_id IS NULL
    AND stripe_payment_intent_id IS NULL
    AND paid_at IS NULL
    AND audio_uploaded_at IS NULL
    AND (auth.jwt() ->> 'email') IS NOT NULL
    AND lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Also ensure anon cannot INSERT at the grant level.
REVOKE INSERT ON public.live_submissions FROM anon;