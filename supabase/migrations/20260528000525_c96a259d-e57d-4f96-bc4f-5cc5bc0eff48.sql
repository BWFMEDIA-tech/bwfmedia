
DROP POLICY IF EXISTS "Host or admin can update stage participants" ON public.stage_participants;
CREATE POLICY "Host or admin can update stage participants"
  ON public.stage_participants FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stage_participants.stream_id AND s.host_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stage_participants.stream_id AND s.host_id = auth.uid())
  );

DROP POLICY IF EXISTS "User cancels or host updates" ON public.raise_hand_requests;
CREATE POLICY "User cancels or host updates"
  ON public.raise_hand_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = raise_hand_requests.stream_id AND s.host_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = raise_hand_requests.stream_id AND s.host_id = auth.uid())
  );

DROP POLICY IF EXISTS "Host or self can update queue" ON public.stream_queue;
CREATE POLICY "Host or self can update queue"
  ON public.stream_queue FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_queue.stream_id AND s.host_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_queue.stream_id AND s.host_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins or mods can update/unban" ON public.user_bans;
CREATE POLICY "Admins or mods can update/unban"
  ON public.user_bans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
