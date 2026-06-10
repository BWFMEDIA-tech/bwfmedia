CREATE POLICY "Host or admin can add stage participants"
ON public.stage_participants
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
  OR EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = stage_participants.stream_id
      AND s.host_id = auth.uid()
  )
);