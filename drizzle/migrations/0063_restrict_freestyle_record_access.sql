DROP POLICY IF EXISTS freestyle_read ON public.freestyle_battles;
CREATE POLICY freestyle_read ON public.freestyle_battles FOR SELECT TO authenticated
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'moderator'));

-- Audience/performers receive only the latest display state of a live stream,
-- never the unrestricted battle history or host-management record.
CREATE FUNCTION public.get_freestyle_display(_stream_id uuid)
RETURNS TABLE (id uuid, artist_a_id uuid, artist_b_id uuid, status text, ends_at timestamptz, votes_a integer, votes_b integer, winner_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT b.id, b.artist_a_id, b.artist_b_id, b.status, b.ends_at, b.votes_a, b.votes_b, b.winner_id
 FROM public.freestyle_battles b
 JOIN public.streams s ON s.id = b.stream_id
 WHERE auth.uid() IS NOT NULL AND b.stream_id = _stream_id AND s.status = 'live'
 ORDER BY b.started_at DESC, b.id DESC LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_freestyle_display(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_freestyle_display(uuid) TO authenticated, service_role;