CREATE TABLE public.battle_tournaments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz);
GRANT SELECT ON public.battle_tournaments TO authenticated;
GRANT ALL ON public.battle_tournaments TO service_role;
ALTER TABLE public.battle_tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tournament_read ON public.battle_tournaments FOR SELECT TO authenticated USING(true);
CREATE UNIQUE INDEX one_open_battle_tournament ON public.battle_tournaments(status) WHERE status='open';
CREATE TABLE public.battle_tournament_eliminations (tournament_id uuid NOT NULL REFERENCES public.battle_tournaments(id), artist_id uuid NOT NULL, match_id uuid NOT NULL REFERENCES public.battle_matches(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tournament_id,artist_id));
GRANT SELECT ON public.battle_tournament_eliminations TO authenticated;
GRANT ALL ON public.battle_tournament_eliminations TO service_role;
ALTER TABLE public.battle_tournament_eliminations ENABLE ROW LEVEL SECURITY;
CREATE POLICY elimination_read ON public.battle_tournament_eliminations FOR SELECT TO authenticated USING(artist_id=auth.uid() OR public.has_role(auth.uid(),'host') OR public.has_role(auth.uid(),'admin'));
ALTER TABLE public.battle_challenges ADD COLUMN tournament_id uuid REFERENCES public.battle_tournaments(id);
ALTER TABLE public.battle_matches ADD COLUMN tournament_id uuid REFERENCES public.battle_tournaments(id);
CREATE INDEX tournament_challenges ON public.battle_challenges(tournament_id,status);
CREATE INDEX tournament_matches ON public.battle_matches(tournament_id,status);
CREATE FUNCTION public.lock_battle_tournament() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(723941802);
 SELECT id INTO tid FROM public.battle_tournaments WHERE status='open' FOR UPDATE;
 IF tid IS NULL THEN INSERT INTO public.battle_tournaments(created_by) VALUES(auth.uid()) RETURNING id INTO tid; END IF;
 RETURN tid;
END $$;
REVOKE ALL ON FUNCTION public.lock_battle_tournament() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.battle_tournament_filled(tid uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT (SELECT count(*) FROM public.battle_challenges c WHERE c.tournament_id=tid AND c.status IN ('accepted','scheduled','live')) + (SELECT count(*) FROM public.battle_matches m WHERE m.tournament_id=tid AND m.status IN ('pending','live') AND (m.status='live' OR (m.genre_agreed_a AND m.genre_agreed_b)) AND NOT EXISTS(SELECT 1 FROM public.battle_challenges c WHERE c.match_id=m.id AND c.tournament_id=tid AND c.status IN ('accepted','scheduled','live')));
$$;
REVOKE ALL ON FUNCTION public.battle_tournament_filled(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.enforce_battle_tournament() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid; aid uuid; bid uuid; cid uuid; mid uuid; old_active boolean := false; counts_slot boolean; previous_slot boolean := false; filled integer;
BEGIN
 IF TG_TABLE_NAME='battle_matches' THEN
  IF NEW.status NOT IN ('pending','live') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.artist_a_id IS NOT DISTINCT FROM OLD.artist_a_id AND NEW.artist_b_id IS NOT DISTINCT FROM OLD.artist_b_id AND NEW.genre_agreed_a IS NOT DISTINCT FROM OLD.genre_agreed_a AND NEW.genre_agreed_b IS NOT DISTINCT FROM OLD.genre_agreed_b AND NEW.tournament_id IS NOT DISTINCT FROM OLD.tournament_id THEN RETURN NEW; END IF;
   IF OLD.tournament_id IS NOT NULL AND NEW.tournament_id IS DISTINCT FROM OLD.tournament_id THEN RAISE EXCEPTION 'Tournament is locked'; END IF;
   previous_slot := OLD.status IN ('pending','live') AND (OLD.status='live' OR (OLD.genre_agreed_a AND OLD.genre_agreed_b)) AND OLD.tournament_id IS NOT NULL;
  END IF;
  aid:=NEW.artist_a_id; bid:=NEW.artist_b_id; mid:=NEW.id;
  IF aid IS NULL OR bid IS NULL OR aid=bid THEN RAISE EXCEPTION 'Two different artists are required'; END IF;
  SELECT id INTO cid FROM public.battle_challenges WHERE status IN ('accepted','scheduled','live') AND challenger_id=aid AND challenged_id=bid AND genre IS NOT DISTINCT FROM NEW.genre AND (match_id=mid OR (match_id IS NULL AND (public.has_role(NEW.host_id,'host') OR public.has_role(NEW.host_id,'admin')))) LIMIT 1;
  counts_slot := NEW.status='live' OR (NEW.genre_agreed_a AND NEW.genre_agreed_b);
  IF NEW.status='live' AND NOT (NEW.genre_agreed_a AND NEW.genre_agreed_b) THEN RAISE EXCEPTION 'Both artists must accept before starting'; END IF;
 ELSE
  IF NEW.status NOT IN ('pending','accepted','scheduled','live') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
   IF OLD.tournament_id IS NOT NULL AND NEW.tournament_id IS DISTINCT FROM OLD.tournament_id THEN RAISE EXCEPTION 'Tournament is locked'; END IF;
   previous_slot:=OLD.status IN ('accepted','scheduled','live') AND OLD.tournament_id IS NOT NULL;
  END IF;
  aid:=NEW.challenger_id; bid:=NEW.challenged_id; cid:=NEW.id; mid:=NEW.match_id;
  counts_slot:=NEW.status IN ('accepted','scheduled','live');
 END IF;
 tid:=public.lock_battle_tournament();
 IF NEW.tournament_id IS NOT NULL AND NEW.tournament_id<>tid THEN RAISE EXCEPTION 'This tournament is closed'; END IF;
 NEW.tournament_id:=tid;
 IF EXISTS(SELECT 1 FROM public.battle_tournament_eliminations WHERE tournament_id=tid AND artist_id IN (aid,bid)) THEN RAISE EXCEPTION 'An artist was eliminated from this tournament'; END IF;
 IF EXISTS(SELECT 1 FROM public.battle_challenges c WHERE c.status IN ('pending','accepted','scheduled','live') AND c.id IS DISTINCT FROM cid AND (c.challenger_id IN(aid,bid) OR c.challenged_id IN(aid,bid))) OR EXISTS(SELECT 1 FROM public.battle_matches m WHERE m.status IN ('pending','live') AND m.id IS DISTINCT FROM mid AND (m.artist_a_id IN(aid,bid) OR m.artist_b_id IN(aid,bid))) THEN RAISE EXCEPTION 'An artist already has a pending or active opponent'; END IF;
 filled:=public.battle_tournament_filled(tid);
 IF NOT previous_slot AND filled>=20 THEN
  IF NOT (TG_TABLE_NAME='battle_matches' AND cid IS NOT NULL) AND NOT (TG_TABLE_NAME='battle_challenges' AND mid IS NOT NULL AND EXISTS(SELECT 1 FROM public.battle_matches WHERE id=mid AND tournament_id=tid AND (status='live' OR (genre_agreed_a AND genre_agreed_b)))) THEN RAISE EXCEPTION 'All 20 battle slots are filled'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_battle_tournament() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_challenge_tournament_guard BEFORE INSERT OR UPDATE ON public.battle_challenges FOR EACH ROW EXECUTE FUNCTION public.enforce_battle_tournament();
CREATE TRIGGER zz_match_tournament_guard BEFORE INSERT OR UPDATE ON public.battle_matches FOR EACH ROW EXECUTE FUNCTION public.enforce_battle_tournament();
CREATE FUNCTION public.battle_tournament_notifications() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid; title_text text; body_text text; event_key text; loser uuid;
BEGIN
 IF TG_TABLE_NAME='battle_challenges' THEN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status='accepted' THEN title_text:='Battle challenge accepted'; body_text:='Your '||NEW.genre||' matchup is confirmed in Create 1v1 Battle.'; event_key:='battle-accepted:'||NEW.id;
  ELSIF NEW.status='scheduled' THEN title_text:='Battle scheduled'; body_text:='Your '||NEW.genre||' battle is scheduled for '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Chicago','Mon DD, YYYY HH12:MI AM')||' CT.'; event_key:='battle-scheduled:'||NEW.id||':'||NEW.scheduled_at;
  ELSE RETURN NEW; END IF;
  INSERT INTO public.notifications(user_id,type,title,body,link,actor_id,source_event) SELECT artist,'battle_challenge',title_text,body_text,'/play',auth.uid(),event_key FROM unnest(ARRAY[NEW.challenger_id,NEW.challenged_id]) artist ON CONFLICT DO NOTHING;
 ELSE
  IF NEW.status NOT IN ('completed','cancelled') OR OLD.status=NEW.status THEN RETURN NEW; END IF;
  PERFORM public.lock_battle_tournament();
  IF NEW.status='completed' AND NEW.tournament_id IS NOT NULL AND NEW.winner_id IN (NEW.artist_a_id,NEW.artist_b_id) THEN
   loser:=CASE WHEN NEW.winner_id=NEW.artist_a_id THEN NEW.artist_b_id ELSE NEW.artist_a_id END;
   INSERT INTO public.battle_tournament_eliminations(tournament_id,artist_id,match_id) VALUES(NEW.tournament_id,loser,NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.status='completed' THEN
   FOREACH uid IN ARRAY ARRAY[NEW.artist_a_id,NEW.artist_b_id] LOOP
    title_text:=CASE WHEN NEW.winner_id IS NULL THEN 'Battle ended in a tie' WHEN NEW.winner_id=uid THEN 'You won your battle' ELSE 'You lost your battle' END;
    body_text:=CASE WHEN NEW.winner_id IS NULL THEN 'Neither artist is eliminated. You can challenge again when a slot is available.' WHEN NEW.winner_id=uid THEN 'You can select your next opponent when a battle slot is available.' ELSE 'You are eliminated from this tournament. A host starts the next tournament to reset eligibility.' END;
    INSERT INTO public.notifications(user_id,type,title,body,link,stream_id,actor_id,source_event) VALUES(uid,'battle_challenge',title_text,body_text,'/play',NEW.stream_id,NEW.host_id,'battle-result:'||NEW.id) ON CONFLICT DO NOTHING;
   END LOOP;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.battle_tournament_notifications() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER tournament_challenge_notifications AFTER UPDATE OF status ON public.battle_challenges FOR EACH ROW EXECUTE FUNCTION public.battle_tournament_notifications();
CREATE TRIGGER tournament_match_results AFTER UPDATE OF status ON public.battle_matches FOR EACH ROW EXECUTE FUNCTION public.battle_tournament_notifications();
CREATE FUNCTION public.get_battle_tournament_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid; filled integer; blocked boolean; eliminated boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT id INTO tid FROM public.battle_tournaments WHERE status='open';
 filled:=COALESCE(public.battle_tournament_filled(tid),0);
 blocked:=EXISTS(SELECT 1 FROM public.battle_challenges WHERE status IN ('pending','accepted','scheduled','live') AND auth.uid() IN(challenger_id,challenged_id)) OR EXISTS(SELECT 1 FROM public.battle_matches WHERE status IN ('pending','live') AND auth.uid() IN(artist_a_id,artist_b_id));
 eliminated:=EXISTS(SELECT 1 FROM public.battle_tournament_eliminations WHERE tournament_id=tid AND artist_id=auth.uid());
 RETURN jsonb_build_object('tournamentId',tid,'filled',filled,'capacity',20,'available',greatest(0,20-filled),'hasMatchup',blocked,'eliminated',eliminated,'canSubmit',NOT blocked AND NOT eliminated AND filled<20);
END $$;
REVOKE ALL ON FUNCTION public.get_battle_tournament_state() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_battle_tournament_state() TO authenticated,service_role;
CREATE FUNCTION public.start_new_battle_tournament() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT(public.has_role(auth.uid(),'host') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Only hosts and admins can start a new tournament'; END IF;
 tid:=public.lock_battle_tournament();
 IF EXISTS(SELECT 1 FROM public.battle_challenges WHERE status IN ('pending','accepted','scheduled','live')) OR EXISTS(SELECT 1 FROM public.battle_matches WHERE status IN ('pending','live')) THEN RAISE EXCEPTION 'Finish or cancel outstanding matchups before starting a new tournament'; END IF;
 UPDATE public.battle_tournaments SET status='closed',closed_at=now() WHERE id=tid;
 INSERT INTO public.battle_tournaments(created_by) VALUES(auth.uid()) RETURNING id INTO tid;
 RETURN tid;
END $$;
REVOKE ALL ON FUNCTION public.start_new_battle_tournament() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_new_battle_tournament() TO authenticated,service_role;