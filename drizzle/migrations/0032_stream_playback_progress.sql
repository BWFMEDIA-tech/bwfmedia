CREATE OR REPLACE FUNCTION public.update_stream_playback_progress(p_event_id uuid, p_duration_played_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event public.stream_events%ROWTYPE; v_duration integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO v_event FROM public.stream_events WHERE id=p_event_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown playback'; END IF;
 v_duration := LEAST(GREATEST(COALESCE(p_duration_played_seconds,0),0),36000, GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (clock_timestamp()-v_event.created_at)))::integer));
 UPDATE public.stream_events SET duration_played_seconds=GREATEST(duration_played_seconds,v_duration) WHERE id=v_event.id;
 RETURN v_duration >= 30;
END; $$;
REVOKE ALL ON FUNCTION public.update_stream_playback_progress(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_stream_playback_progress(uuid,integer) TO authenticated,service_role;
COMMENT ON FUNCTION public.update_stream_playback_progress(uuid,integer) IS 'Update only the caller''s existing playback, monotonically, bounded by server elapsed time; existing enrichment trigger retains the 30-second royalty validity threshold.';