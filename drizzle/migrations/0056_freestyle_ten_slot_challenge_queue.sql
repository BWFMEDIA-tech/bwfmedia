CREATE TABLE public.freestyle_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), artist_a_id uuid NOT NULL, artist_b_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','scheduled','live','completed','declined','cancelled')),
 slot_number integer CHECK(slot_number BETWEEN 1 AND 10), stream_id uuid REFERENCES public.streams(id), battle_id uuid REFERENCES public.freestyle_battles(id), scheduled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(artist_a_id<>artist_b_id)
);
GRANT SELECT ON public.freestyle_challenges TO authenticated;
GRANT ALL ON public.freestyle_challenges TO service_role;
ALTER TABLE public.freestyle_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY freestyle_challenges_read ON public.freestyle_challenges FOR SELECT TO authenticated USING(status IN ('accepted','scheduled','live','completed') OR auth.uid() IN (artist_a_id,artist_b_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'host'));
CREATE UNIQUE INDEX freestyle_slot_unique ON public.freestyle_challenges(slot_number) WHERE status IN ('accepted','scheduled','live');
CREATE FUNCTION public.freestyle_challenge_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE aid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(731910);
 NEW.updated_at:=clock_timestamp();
 IF TG_OP='UPDATE' AND (NEW.artist_a_id<>OLD.artist_a_id OR NEW.artist_b_id<>OLD.artist_b_id) THEN RAISE EXCEPTION 'Artists are locked'; END IF;
 IF NEW.status IN ('pending','accepted','scheduled','live') THEN
  FOREACH aid IN ARRAY ARRAY[NEW.artist_a_id,NEW.artist_b_id] LOOP
   IF NOT public.has_role(aid,'artist') OR EXISTS(SELECT 1 FROM public.user_bans WHERE user_id=aid AND (expires_at IS NULL OR expires_at>now())) THEN RAISE EXCEPTION 'Both participants must be eligible artists'; END IF;
   IF EXISTS(SELECT 1 FROM public.freestyle_challenges WHERE id<>NEW.id AND status IN ('pending','accepted','scheduled','live') AND aid IN (artist_a_id,artist_b_id)) THEN RAISE EXCEPTION 'Each artist can have only one pending or active freestyle challenge'; END IF;
   IF EXISTS(SELECT 1 FROM public.freestyle_battles b WHERE b.status='live' AND aid IN (b.artist_a_id,b.artist_b_id) AND b.id IS DISTINCT FROM NEW.battle_id) THEN RAISE EXCEPTION 'Artist already has a live freestyle battle'; END IF;
  END LOOP;
 END IF;
 IF NEW.status='pending' AND TG_OP='INSERT' AND (SELECT count(*) FROM public.freestyle_challenges WHERE status IN ('accepted','scheduled','live'))>=10 THEN RAISE EXCEPTION 'All 10 freestyle slots are filled'; END IF;
 IF NEW.status IN ('accepted','scheduled','live') THEN
  IF TG_OP='INSERT' THEN RAISE EXCEPTION 'Challenge must be accepted first'; END IF;
  IF OLD.status='pending' AND NEW.status<>'accepted' THEN RAISE EXCEPTION 'Challenge must be accepted first'; END IF;
  IF OLD.status NOT IN ('pending','accepted','scheduled','live') THEN RAISE EXCEPTION 'Challenge is closed'; END IF;
  IF NEW.slot_number IS NULL THEN SELECT n INTO NEW.slot_number FROM generate_series(1,10) n WHERE NOT EXISTS(SELECT 1 FROM public.freestyle_challenges c WHERE c.slot_number=n AND c.status IN ('accepted','scheduled','live') AND c.id<>NEW.id) ORDER BY n LIMIT 1; END IF;
  IF NEW.slot_number IS NULL THEN RAISE EXCEPTION 'All 10 freestyle slots are filled'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freestyle_challenge_guard BEFORE INSERT OR UPDATE ON public.freestyle_challenges FOR EACH ROW EXECUTE FUNCTION public.freestyle_challenge_guard();
CREATE FUNCTION public.freestyle_challenge_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recipient uuid; heading text; message text; event_key text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NEW; END IF;
 IF NEW.status='pending' THEN heading:='TUNEVIO Freestyle Invitation'; message:='You have been selected for a freestyle battle. Accept or decline in the Battle Arena.';
 ELSIF NEW.status='accepted' THEN heading:='TUNEVIO Freestyle Challenge Accepted'; message:='Your matchup is accepted and assigned to slot '||NEW.slot_number||'/10.';
 ELSIF NEW.status='declined' THEN heading:='TUNEVIO Freestyle Challenge Declined'; message:='The invitation was declined. You can select another opponent.';
 ELSIF NEW.status='scheduled' THEN heading:='TUNEVIO Freestyle Battle Scheduled'; message:='Your battle is scheduled for '||to_char(NEW.scheduled_at AT TIME ZONE 'UTC','Mon DD HH24:MI')||' UTC.';
 ELSIF NEW.status='cancelled' THEN heading:='TUNEVIO Freestyle Matchup Cancelled'; message:='Your matchup was cancelled and the slot is available.';
 ELSE RETURN NEW; END IF;
 event_key:='freestyle-challenge:'||NEW.id||':'||NEW.status||':'||coalesce(NEW.scheduled_at::text,'');
 FOREACH recipient IN ARRAY ARRAY[NEW.artist_a_id,NEW.artist_b_id] LOOP
  IF NEW.status='pending' AND recipient=NEW.artist_a_id THEN CONTINUE; END IF;
  INSERT INTO public.notifications(user_id,type,title,body,link,actor_id,stream_id,source_event) VALUES(recipient,'battle_challenge',heading,message,'/play',auth.uid(),NEW.stream_id,event_key) ON CONFLICT(user_id,source_event) DO NOTHING;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER freestyle_challenge_notify AFTER INSERT OR UPDATE ON public.freestyle_challenges FOR EACH ROW EXECUTE FUNCTION public.freestyle_challenge_notify();
CREATE FUNCTION public.submit_freestyle_challenge(_opponent uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF _opponent IS NULL OR _opponent=auth.uid() THEN RAISE EXCEPTION 'Select another artist'; END IF;
 INSERT INTO public.freestyle_challenges(artist_a_id,artist_b_id) VALUES(auth.uid(),_opponent) RETURNING id INTO cid; RETURN cid;
END $$;
CREATE FUNCTION public.respond_freestyle_challenge(_id uuid,_accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.freestyle_challenges;
BEGIN
 PERFORM pg_advisory_xact_lock(731910);
 SELECT * INTO c FROM public.freestyle_challenges WHERE id=_id FOR UPDATE;
 IF auth.uid() IS NULL OR c.artist_b_id IS DISTINCT FROM auth.uid() OR c.status<>'pending' OR _accept IS NULL THEN RAISE EXCEPTION 'Only the invited artist can respond to a pending challenge'; END IF;
 UPDATE public.freestyle_challenges SET status=CASE WHEN _accept THEN 'accepted' ELSE 'declined' END WHERE id=_id;
END $$;
CREATE FUNCTION public.control_freestyle_challenge(_id uuid,_action text,_stream_id uuid DEFAULT NULL,_scheduled_at timestamptz DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.freestyle_challenges; owner uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(731910);
 SELECT * INTO c FROM public.freestyle_challenges WHERE id=_id FOR UPDATE;
 IF c.id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Challenge not found'; END IF;
 IF _action='cancel' AND c.status IN ('pending','accepted','scheduled') AND auth.uid() IN (c.artist_a_id,c.artist_b_id) THEN UPDATE public.freestyle_challenges SET status='cancelled' WHERE id=_id; RETURN; END IF;
 SELECT host_id INTO owner FROM public.streams WHERE id=coalesce(_stream_id,c.stream_id);
 IF NOT public.has_role(auth.uid(),'admin') AND (owner IS DISTINCT FROM auth.uid() OR NOT public.has_role(auth.uid(),'host')) THEN RAISE EXCEPTION 'Only an authorized host or admin can control this queue'; END IF;
 IF c.stream_id IS NOT NULL AND c.stream_id IS DISTINCT FROM _stream_id AND _action='schedule' THEN RAISE EXCEPTION 'Matchup is already assigned to another stage'; END IF;
 IF _action='schedule' AND c.status IN ('accepted','scheduled') AND _stream_id IS NOT NULL AND _scheduled_at>clock_timestamp() THEN
  UPDATE public.freestyle_challenges SET status='scheduled',stream_id=_stream_id,scheduled_at=_scheduled_at WHERE id=_id;
 ELSIF _action='cancel' AND c.status IN ('pending','accepted','scheduled') THEN UPDATE public.freestyle_challenges SET status='cancelled' WHERE id=_id;
 ELSE RAISE EXCEPTION 'Invalid queue transition'; END IF;
END $$;
CREATE FUNCTION public.freestyle_queue_start_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.freestyle_challenges;
BEGIN
 PERFORM pg_advisory_xact_lock(731910);
 SELECT * INTO c FROM public.freestyle_challenges WHERE artist_a_id=NEW.artist_a_id AND artist_b_id=NEW.artist_b_id AND status IN ('accepted','scheduled') FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Select an accepted freestyle matchup'; END IF;
 IF c.stream_id IS NOT NULL AND c.stream_id<>NEW.stream_id THEN RAISE EXCEPTION 'Matchup belongs to another stage'; END IF;
 IF EXISTS(SELECT 1 FROM public.freestyle_battles WHERE status='live' AND (artist_a_id IN (NEW.artist_a_id,NEW.artist_b_id) OR artist_b_id IN (NEW.artist_a_id,NEW.artist_b_id))) THEN RAISE EXCEPTION 'Artist already has a live freestyle battle'; END IF;
 UPDATE public.freestyle_challenges SET status='live',stream_id=NEW.stream_id WHERE id=c.id;
 RETURN NEW;
END $$;
CREATE TRIGGER freestyle_queue_start_guard BEFORE INSERT ON public.freestyle_battles FOR EACH ROW EXECUTE FUNCTION public.freestyle_queue_start_guard();
CREATE FUNCTION public.freestyle_queue_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN UPDATE public.freestyle_challenges SET battle_id=NEW.id WHERE artist_a_id=NEW.artist_a_id AND artist_b_id=NEW.artist_b_id AND status='live' AND stream_id=NEW.stream_id;
 ELSIF NEW.status IN ('completed','cancelled') AND OLD.status<>NEW.status THEN UPDATE public.freestyle_challenges SET status=NEW.status WHERE battle_id=NEW.id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER freestyle_queue_sync AFTER INSERT OR UPDATE ON public.freestyle_battles FOR EACH ROW EXECUTE FUNCTION public.freestyle_queue_sync();
CREATE FUNCTION public.end_freestyle_battle(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.freestyle_battles;
BEGIN
 SELECT * INTO b FROM public.freestyle_battles WHERE id=_id FOR UPDATE;
 IF auth.uid() IS NULL OR (NOT public.has_role(auth.uid(),'admin') AND (b.host_id IS DISTINCT FROM auth.uid() OR NOT public.has_role(auth.uid(),'host'))) THEN RAISE EXCEPTION 'Only the authorized host or admin can end the battle'; END IF;
 IF b.status='live' THEN UPDATE public.freestyle_battles SET ends_at=clock_timestamp() WHERE id=_id; PERFORM public.finalize_freestyle_battle(_id); END IF;
END $$;
REVOKE ALL ON FUNCTION public.submit_freestyle_challenge(uuid),public.respond_freestyle_challenge(uuid,boolean),public.control_freestyle_challenge(uuid,text,uuid,timestamptz),public.end_freestyle_battle(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_freestyle_challenge(uuid),public.respond_freestyle_challenge(uuid,boolean),public.control_freestyle_challenge(uuid,text,uuid,timestamptz),public.end_freestyle_battle(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.freestyle_challenge_guard(),public.freestyle_challenge_notify(),public.freestyle_queue_start_guard(),public.freestyle_queue_sync() FROM PUBLIC,anon,authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.freestyle_challenges;