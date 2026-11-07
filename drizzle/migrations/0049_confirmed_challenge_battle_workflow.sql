CREATE OR REPLACE FUNCTION public.battle_challenges_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  PERFORM pg_advisory_xact_lock(hashtextextended(least(NEW.challenger_id::text, NEW.challenged_id::text) || ':' || greatest(NEW.challenger_id::text, NEW.challenged_id::text) || ':' || NEW.genre, 0));
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin')) THEN
    IF NEW.challenger_id IS DISTINCT FROM OLD.challenger_id OR NEW.challenged_id IS DISTINCT FROM OLD.challenged_id OR NEW.genre IS DISTINCT FROM OLD.genre OR NEW.match_id IS DISTINCT FROM OLD.match_id OR NEW.stream_id IS DISTINCT FROM OLD.stream_id OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
      RAISE EXCEPTION 'Challenge details are locked';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'pending' AND auth.uid() = OLD.challenged_id AND NEW.status IN ('accepted','declined')) OR
      (OLD.status IN ('pending','accepted','scheduled') AND auth.uid() IN (OLD.challenger_id,OLD.challenged_id) AND NEW.status = 'cancelled') OR
      (NEW.status IN ('completed','cancelled') AND EXISTS (SELECT 1 FROM public.battle_matches m WHERE m.id = OLD.match_id AND m.status = NEW.status))
    ) THEN RAISE EXCEPTION 'This challenge transition is not allowed'; END IF;
  END IF;
  IF NEW.status = 'scheduled' AND TG_OP = 'UPDATE' AND OLD.status NOT IN ('accepted','scheduled') THEN
    RAISE EXCEPTION 'Both artists must accept before scheduling';
  END IF;
  IF NEW.status IN ('pending','accepted','scheduled','live') AND EXISTS (
    SELECT 1 FROM public.battle_challenges c WHERE c.id <> NEW.id AND c.status IN ('pending','accepted','scheduled','live') AND c.genre = NEW.genre
    AND least(c.challenger_id::text,c.challenged_id::text) = least(NEW.challenger_id::text,NEW.challenged_id::text)
    AND greatest(c.challenger_id::text,c.challenged_id::text) = greatest(NEW.challenger_id::text,NEW.challenged_id::text)
  ) THEN RAISE EXCEPTION 'An active challenge already exists between these artists in this genre'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.queue_confirmed_genre_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.genre IS NOT NULL AND NEW.genre_agreed_a AND NEW.genre_agreed_b
     AND NEW.host_id IN (NEW.artist_a_id,NEW.artist_b_id)
     AND NOT EXISTS (SELECT 1 FROM public.battle_challenges WHERE match_id = NEW.id) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(least(NEW.artist_a_id::text,NEW.artist_b_id::text) || ':' || greatest(NEW.artist_a_id::text,NEW.artist_b_id::text) || ':' || NEW.genre,0));
    IF NOT EXISTS (SELECT 1 FROM public.battle_challenges c WHERE c.genre = NEW.genre AND c.status IN ('pending','accepted','scheduled','live')
      AND least(c.challenger_id::text,c.challenged_id::text) = least(NEW.artist_a_id::text,NEW.artist_b_id::text)
      AND greatest(c.challenger_id::text,c.challenged_id::text) = greatest(NEW.artist_a_id::text,NEW.artist_b_id::text)) THEN
      INSERT INTO public.battle_challenges(challenger_id,challenged_id,genre,status,match_id,stream_id)
      VALUES(NEW.artist_a_id,NEW.artist_b_id,NEW.genre,'accepted',NEW.id,NEW.stream_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER queue_confirmed_genre_match_trg AFTER UPDATE OF genre_agreed_a,genre_agreed_b ON public.battle_matches
FOR EACH ROW EXECUTE FUNCTION public.queue_confirmed_genre_match();

CREATE OR REPLACE FUNCTION public.battle_challenges_sync_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('completed','cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.battle_challenges SET status = NEW.status, updated_at = now()
    WHERE match_id = NEW.id AND status IN ('accepted','scheduled','live');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_confirmed_battle(_challenge_id uuid, _stream_id uuid, _rounds integer DEFAULT 3, _seconds integer DEFAULT 60, _track_a uuid DEFAULT NULL, _track_b uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c public.battle_challenges%ROWTYPE; mid uuid; existing_status text;
BEGIN
  IF uid IS NULL OR NOT (public.has_role(uid,'host') OR public.has_role(uid,'admin')) THEN RAISE EXCEPTION 'Only hosts and admins can start battles'; END IF;
  PERFORM 1 FROM public.streams WHERE id = _stream_id AND (host_id = uid OR public.has_role(uid,'admin')) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the stream owner or admin can start this matchup'; END IF;
  SELECT * INTO c FROM public.battle_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND OR c.status NOT IN ('accepted','scheduled') THEN RAISE EXCEPTION 'Both artists must accept, and this matchup must not have started'; END IF;
  IF _rounds NOT BETWEEN 1 AND 9 OR _seconds NOT BETWEEN 15 AND 600 THEN RAISE EXCEPTION 'Invalid battle settings'; END IF;
  IF EXISTS (SELECT 1 FROM public.battle_matches WHERE stream_id = _stream_id AND status = 'live') THEN RAISE EXCEPTION 'Finish the live battle first'; END IF;
  IF _track_a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.play_tracks WHERE id = _track_a AND artist_user_id = c.challenger_id AND status <> 'removed') THEN RAISE EXCEPTION 'Side A track must belong to the challenger'; END IF;
  IF _track_b IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.play_tracks WHERE id = _track_b AND artist_user_id = c.challenged_id AND status <> 'removed') THEN RAISE EXCEPTION 'Side B track must belong to the challenged artist'; END IF;
  mid := c.match_id;
  IF mid IS NOT NULL THEN
    SELECT status INTO existing_status FROM public.battle_matches WHERE id = mid FOR UPDATE;
    IF existing_status IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'This matchup has already started or ended'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.battle_matches WHERE stream_id = _stream_id AND status = 'pending' AND id IS DISTINCT FROM mid) THEN RAISE EXCEPTION 'Finish or cancel the prepared matchup first'; END IF;
  IF mid IS NULL THEN
    INSERT INTO public.battle_matches(stream_id,host_id,artist_a_id,artist_b_id,artist_a_name,artist_b_name,total_rounds,round_seconds,genre,status)
    VALUES(_stream_id,uid,c.challenger_id,c.challenged_id,
      COALESCE((SELECT COALESCE(stage_name,display_name) FROM public.profiles WHERE id=c.challenger_id),'Artist'),
      COALESCE((SELECT COALESCE(stage_name,display_name) FROM public.profiles WHERE id=c.challenged_id),'Artist'),_rounds,_seconds,c.genre,'pending') RETURNING id INTO mid;
  ELSE
    UPDATE public.battle_matches SET stream_id = _stream_id,host_id = uid,total_rounds = _rounds,round_seconds = _seconds WHERE id = mid;
  END IF;
  PERFORM set_config('app.genre_agree','on',true);
  UPDATE public.battle_matches SET genre_agreed_a = true,genre_agreed_b = true WHERE id = mid;
  PERFORM set_config('app.genre_agree','off',true);
  IF _track_a IS NOT NULL THEN UPDATE public.play_tracks SET stream_id=_stream_id,battle_match_id=mid,battle_side='a',status='queued' WHERE id=_track_a; END IF;
  IF _track_b IS NOT NULL THEN UPDATE public.play_tracks SET stream_id=_stream_id,battle_match_id=mid,battle_side='b',status='queued' WHERE id=_track_b; END IF;
  UPDATE public.battle_challenges SET status='live',match_id=mid,stream_id=_stream_id WHERE id=c.id;
  RETURN mid;
END $$;
REVOKE ALL ON FUNCTION public.prepare_confirmed_battle(uuid,uuid,integer,integer,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_confirmed_battle(uuid,uuid,integer,integer,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.queue_confirmed_genre_match() FROM PUBLIC,anon,authenticated;