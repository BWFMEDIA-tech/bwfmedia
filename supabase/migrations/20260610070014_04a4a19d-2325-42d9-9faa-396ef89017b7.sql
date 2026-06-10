-- Tighten stream_messages INSERT to require stream membership (stage_participants row),
-- aligning write access with the existing SELECT policy. Host and admin/moderator
-- always allowed.
DROP POLICY IF EXISTS "Authenticated can send messages" ON public.stream_messages;

CREATE POLICY "Stream participants can send messages"
ON public.stream_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.streams s
      WHERE s.id = stream_messages.stream_id AND s.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.stage_participants sp
      WHERE sp.stream_id = stream_messages.stream_id
        AND sp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
);

-- Ensure realtime broadcasts INSERTs for instant updates across all viewers.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

ALTER TABLE public.stream_messages REPLICA IDENTITY FULL;