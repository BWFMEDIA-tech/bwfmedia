CREATE FUNCTION public.is_current_stream_moderator(_stream_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stream_moderators m
    WHERE m.stream_id = _stream_id AND m.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_stream_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_stream_moderator(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.is_current_stream_moderator(uuid) IS 'Checks only the current caller assignment without recursively evaluating stream moderator RLS.';
ALTER POLICY streams_scoped_read ON public.streams
USING (
  status IN ('live', 'idle', 'scheduled')
  OR host_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_current_stream_moderator(id)
);