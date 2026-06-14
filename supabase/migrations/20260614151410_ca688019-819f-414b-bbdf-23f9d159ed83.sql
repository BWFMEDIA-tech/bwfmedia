
DROP POLICY IF EXISTS "Stage participants viewable by stream members" ON public.stage_participants;
CREATE POLICY "Stage participants viewable by stream members"
ON public.stage_participants
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR is_stream_host(auth.uid(), stream_id)
  OR is_stream_participant(auth.uid(), stream_id)
);

DROP POLICY IF EXISTS "Host or admin can update stage participants" ON public.stage_participants;
CREATE POLICY "Host or admin can update stage participants"
ON public.stage_participants
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR (EXISTS (SELECT 1 FROM streams s WHERE s.id = stage_participants.stream_id AND s.host_id = auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR (EXISTS (SELECT 1 FROM streams s WHERE s.id = stage_participants.stream_id AND s.host_id = auth.uid()))
);
