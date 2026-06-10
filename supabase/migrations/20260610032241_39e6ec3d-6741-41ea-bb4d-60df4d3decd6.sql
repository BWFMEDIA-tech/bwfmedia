
DROP POLICY IF EXISTS "Messages viewable by authenticated" ON public.stream_messages;

CREATE POLICY "Joined users can view stream messages"
ON public.stream_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_messages.stream_id AND s.host_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.stage_participants sp WHERE sp.stream_id = stream_messages.stream_id AND sp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);
