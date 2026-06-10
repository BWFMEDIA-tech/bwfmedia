
-- 1) raise_hand_requests SELECT
DROP POLICY IF EXISTS "Hand requests viewable by authenticated" ON public.raise_hand_requests;
CREATE POLICY "Hand requests viewable by self host or admin"
  ON public.raise_hand_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = raise_hand_requests.stream_id AND s.host_id = auth.uid())
  );

-- 2) stage_participants SELECT: self, same-stream participants, host, admin/mod
DROP POLICY IF EXISTS "Stage participants viewable by authenticated" ON public.stage_participants;
CREATE POLICY "Stage participants viewable by stream members"
  ON public.stage_participants FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
    OR public.is_stream_host(auth.uid(), stream_id)
    OR EXISTS (
      SELECT 1 FROM public.stage_participants me
      WHERE me.stream_id = stage_participants.stream_id AND me.user_id = auth.uid()
    )
  );

-- 3) stream_queue SELECT
DROP POLICY IF EXISTS "Queue viewable by authenticated" ON public.stream_queue;
CREATE POLICY "Queue viewable by self host or admin"
  ON public.stream_queue FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_queue.stream_id AND s.host_id = auth.uid())
  );

-- 4) tips: remove host UPDATE/DELETE; only service role handles tip lifecycle
DROP POLICY IF EXISTS "Host or admin can update tips" ON public.tips;
DROP POLICY IF EXISTS "Host or admin can delete tips" ON public.tips;
-- (No replacement policies for authenticated UPDATE/DELETE; service_role bypasses RLS.)

-- 5) storage: stream-recordings now private; replace public-read with owner/admin read
DROP POLICY IF EXISTS "Recordings are publicly readable" ON storage.objects;
CREATE POLICY "Recordings readable by owner or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'stream-recordings'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- 6) live_submissions: add user_id, tie ownership to auth.uid()
ALTER TABLE public.live_submissions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS live_submissions_user_id_idx ON public.live_submissions(user_id);

DROP POLICY IF EXISTS live_submissions_select_own ON public.live_submissions;
CREATE POLICY live_submissions_select_own
  ON public.live_submissions FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS live_submissions_update_own ON public.live_submissions;
CREATE POLICY live_submissions_update_own
  ON public.live_submissions FOR UPDATE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS live_submissions_insert_authenticated ON public.live_submissions;
CREATE POLICY live_submissions_insert_authenticated
  ON public.live_submissions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND queue_status = 'queued'
    AND uploaded_audio_url IS NULL
    AND stripe_session_id IS NULL
    AND stripe_payment_intent_id IS NULL
    AND paid_at IS NULL
    AND audio_uploaded_at IS NULL
  );
