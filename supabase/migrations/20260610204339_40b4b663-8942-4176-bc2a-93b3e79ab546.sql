CREATE OR REPLACE FUNCTION public.is_stream_participant(_user_id uuid, _stream_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stage_participants WHERE stream_id = _stream_id AND user_id = _user_id)
$$;

DROP POLICY IF EXISTS "Stage participants viewable by stream members" ON public.stage_participants;
CREATE POLICY "Stage participants viewable by stream members"
ON public.stage_participants FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR is_stream_host(auth.uid(), stream_id)
  OR is_stream_participant(auth.uid(), stream_id)
);