
DROP POLICY IF EXISTS "Users can join stage as listener" ON public.stage_participants;

CREATE POLICY "Users can join live stream as listener"
ON public.stage_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND stage_role = ANY (ARRAY['listener'::text, 'green_room'::text])
  AND EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = stage_participants.stream_id
      AND s.status = 'live'
  )
);
