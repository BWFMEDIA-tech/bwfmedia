CREATE TABLE public.freestyle_battles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), stream_id uuid NOT NULL REFERENCES public.streams(id), host_id uuid NOT NULL, artist_a_id uuid NOT NULL, artist_b_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'live' CHECK(status IN ('live','completed','cancelled')), started_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz NOT NULL, ended_at timestamptz,
 votes_a integer NOT NULL DEFAULT 0, votes_b integer NOT NULL DEFAULT 0, winner_id uuid, CHECK(artist_a_id <> artist_b_id)
);
GRANT SELECT ON public.freestyle_battles TO authenticated;
GRANT ALL ON public.freestyle_battles TO service_role;
ALTER TABLE public.freestyle_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY freestyle_read ON public.freestyle_battles FOR SELECT TO authenticated USING (true);
CREATE UNIQUE INDEX freestyle_one_live_stream ON public.freestyle_battles(stream_id) WHERE status='live';
CREATE TABLE public.freestyle_votes (battle_id uuid NOT NULL REFERENCES public.freestyle_battles(id), user_id uuid NOT NULL, choice text NOT NULL CHECK(choice IN ('a','b')), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(battle_id,user_id));
GRANT SELECT ON public.freestyle_votes TO authenticated;
GRANT ALL ON public.freestyle_votes TO service_role;
ALTER TABLE public.freestyle_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY freestyle_own_vote ON public.freestyle_votes FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.finalize_freestyle_battle(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.freestyle_battles; a integer; c integer; recipient uuid; result_body text; room_name text;
BEGIN
 SELECT * INTO b FROM public.freestyle_battles WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'live' OR clock_timestamp()<b.ends_at THEN RETURN; END IF;
 SELECT count(*) FILTER(WHERE choice='a'),count(*) FILTER(WHERE choice='b') INTO a,c FROM public.freestyle_votes WHERE battle_id=b.id;
 UPDATE public.freestyle_battles SET status='completed',ended_at=ends_at,votes_a=a,votes_b=c,winner_id=CASE WHEN a>c THEN b.artist_a_id WHEN c>a THEN b.artist_b_id ELSE NULL END WHERE id=b.id;
 SELECT s.room_name INTO room_name FROM public.streams s WHERE s.id=b.stream_id;
 FOREACH recipient IN ARRAY ARRAY[b.artist_a_id,b.artist_b_id] LOOP
  result_body:=CASE WHEN a=c THEN 'Your freestyle battle ended in a draw.' WHEN (a>c AND recipient=b.artist_a_id) OR (c>a AND recipient=b.artist_b_id) THEN 'You won your freestyle battle!' ELSE 'Your freestyle battle has finished.' END;
  INSERT INTO public.notifications(user_id,type,title,body,link,actor_id,stream_id,source_event) VALUES(recipient,'battle_result','TUNEVIO Freestyle Battle Result',result_body||' Artist A: '||a||' votes. Artist B: '||c||' votes.','/play/'||room_name,b.host_id,b.stream_id,'freestyle-result:'||b.id) ON CONFLICT(user_id,source_event) DO NOTHING;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.finalize_freestyle_battle(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_freestyle_battle(uuid) TO authenticated,service_role;
CREATE FUNCTION public.finalize_expired_freestyle_battles() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; n integer:=0;
BEGIN
 FOR r IN SELECT id FROM public.freestyle_battles WHERE status='live' AND ends_at<=clock_timestamp() LOOP PERFORM public.finalize_freestyle_battle(r.id); n:=n+1; END LOOP; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.finalize_expired_freestyle_battles() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_expired_freestyle_battles() TO service_role;
CREATE FUNCTION public.start_freestyle_battle(_stream_id uuid,_artist_a uuid,_artist_b uuid,_duration integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner uuid; r record; bid uuid; aid uuid; room_name text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT host_id,s.room_name INTO owner,room_name FROM public.streams s WHERE id=_stream_id AND status='live' FOR UPDATE;
 IF owner IS NULL OR owner<>auth.uid() THEN RAISE EXCEPTION 'Only the live stream owner can start freestyle battles'; END IF;
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
  INSERT INTO public.notifications(user_id,type,title,body,link,actor_id,stream_id,source_event) VALUES(aid,'battle_started','TUNEVIO Freestyle Battle Started','Your live freestyle battle has started.','/play/'||room_name,owner,_stream_id,'freestyle-start:'||bid) ON CONFLICT(user_id,source_event) DO NOTHING;
 END LOOP; RETURN bid;
END $$;
REVOKE ALL ON FUNCTION public.start_freestyle_battle(uuid,uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_freestyle_battle(uuid,uuid,uuid,integer) TO authenticated;
CREATE FUNCTION public.cast_freestyle_vote(_battle_id uuid,_choice text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.freestyle_battles; voter uuid:=auth.uid();
BEGIN
 IF voter IS NULL THEN RAISE EXCEPTION 'Sign in to vote'; END IF;
 IF _choice IS NULL OR _choice NOT IN ('a','b') THEN RAISE EXCEPTION 'Invalid vote'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_bans WHERE user_id=voter AND (expires_at IS NULL OR expires_at>now())) THEN RAISE EXCEPTION 'Voting access is suspended'; END IF;
 SELECT * INTO b FROM public.freestyle_battles WHERE id=_battle_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Battle not found'; END IF;
 IF b.status<>'live' OR clock_timestamp()>=b.ends_at THEN RETURN jsonb_build_object('ok',false,'error','Voting is closed'); END IF;
 IF EXISTS(SELECT 1 FROM public.freestyle_votes WHERE battle_id=b.id AND user_id=voter) THEN RAISE EXCEPTION 'You have already voted in this battle'; END IF;
 INSERT INTO public.freestyle_votes(battle_id,user_id,choice) VALUES(b.id,voter,_choice);
 UPDATE public.freestyle_battles SET votes_a=votes_a+CASE WHEN _choice='a' THEN 1 ELSE 0 END,votes_b=votes_b+CASE WHEN _choice='b' THEN 1 ELSE 0 END WHERE id=b.id;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.cast_freestyle_vote(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cast_freestyle_vote(uuid,text) TO authenticated;
CREATE FUNCTION public.cancel_freestyle_battle(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.freestyle_battles b JOIN public.streams s ON s.id=b.stream_id WHERE b.id=_id AND s.host_id=auth.uid()) THEN RAISE EXCEPTION 'Only the stream owner can cancel'; END IF;
 UPDATE public.freestyle_battles SET status='cancelled',ended_at=clock_timestamp() WHERE id=_id AND status='live';
END $$;
REVOKE ALL ON FUNCTION public.cancel_freestyle_battle(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_freestyle_battle(uuid) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.freestyle_battles;