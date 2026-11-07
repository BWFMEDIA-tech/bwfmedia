CREATE OR REPLACE FUNCTION public.start_freestyle_battle(_stream_id uuid,_artist_a uuid,_artist_b uuid,_duration integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner uuid; r record; bid uuid; aid uuid; room_name text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 PERFORM pg_advisory_xact_lock(731910);
 SELECT host_id,s.room_name INTO owner,room_name FROM public.streams s WHERE id=_stream_id AND status='live' FOR UPDATE;
 IF owner IS NULL OR (NOT public.has_role(auth.uid(),'admin') AND (owner<>auth.uid() OR NOT public.has_role(auth.uid(),'host'))) THEN RAISE EXCEPTION 'Only the authorized host or admin can start freestyle battles'; END IF;
 IF _artist_a IS NULL OR _artist_b IS NULL OR _artist_a=_artist_b THEN RAISE EXCEPTION 'Select two different artists'; END IF;
 IF _duration IS NULL OR _duration<30 OR _duration>900 THEN RAISE EXCEPTION 'Duration must be between 30 and 900 seconds'; END IF;
 FOREACH aid IN ARRAY ARRAY[_artist_a,_artist_b] LOOP
  IF NOT public.has_role(aid,'artist') THEN RAISE EXCEPTION 'Both performers must be artists'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_bans WHERE user_id=aid AND (expires_at IS NULL OR expires_at>now())) THEN RAISE EXCEPTION 'Artist access is suspended'; END IF;
  IF aid<>owner AND NOT EXISTS(SELECT 1 FROM public.stage_participants WHERE stream_id=_stream_id AND user_id=aid AND stage_role IN ('host','co_host','speaker') AND (allow_camera OR stage_role IN ('host','co_host'))) THEN RAISE EXCEPTION 'Both artists need host-approved camera access on stage'; END IF;
 END LOOP;
 FOR r IN SELECT id FROM public.freestyle_battles WHERE stream_id=_stream_id AND status='live' LOOP PERFORM public.finalize_freestyle_battle(r.id); END LOOP;
 IF EXISTS(SELECT 1 FROM public.freestyle_battles WHERE stream_id=_stream_id AND status='live') THEN RAISE EXCEPTION 'A freestyle battle is already live'; END IF;
 INSERT INTO public.freestyle_battles(stream_id,host_id,artist_a_id,artist_b_id,ends_at) VALUES(_stream_id,owner,_artist_a,_artist_b,clock_timestamp()+make_interval(secs=>_duration)) RETURNING id INTO bid;
 FOREACH aid IN ARRAY ARRAY[_artist_a,_artist_b] LOOP
  INSERT INTO public.notifications(user_id,type,title,body,link,actor_id,stream_id,source_event) VALUES(aid,'battle_started','TUNEVIO Freestyle Battle Started','Your live freestyle battle has started.','/play/'||room_name,auth.uid(),_stream_id,'freestyle-start:'||bid) ON CONFLICT(user_id,source_event) DO NOTHING;
 END LOOP; RETURN bid;
END $$;