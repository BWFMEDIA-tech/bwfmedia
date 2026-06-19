DROP POLICY IF EXISTS "Anyone can view live play mode messages" ON public.stream_messages;

CREATE POLICY "Authenticated users can view live play mode messages"
ON public.stream_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = stream_messages.stream_id
      AND s.mode = 'play'
      AND s.status = 'live'
  )
);