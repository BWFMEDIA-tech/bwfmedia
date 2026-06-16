
CREATE POLICY "Anyone can view play mode messages"
ON public.stream_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = stream_messages.stream_id AND s.mode = 'play'
  )
);

CREATE POLICY "Authenticated users can send play mode messages"
ON public.stream_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = stream_messages.stream_id AND s.mode = 'play'
  )
);
