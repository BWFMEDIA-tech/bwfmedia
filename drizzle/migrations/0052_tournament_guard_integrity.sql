CREATE OR REPLACE FUNCTION public.enforce_battle_tournament() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid; aid uuid; bid uuid; cid uuid; mid uuid; previous_slot boolean:=false; filled integer; linked_slot boolean:=false;
BEGIN
 IF TG_OP='UPDATE' AND OLD.tournament_id IS NOT NULL AND NEW.tournament_id IS DISTINCT FROM OLD.tournament_id THEN RAISE EXCEPTION 'Tournament is locked'; END IF;
 IF TG_TABLE_NAME='battle_matches' THEN
  IF NEW.status NOT IN ('pending','live') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
   IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.artist_a_id IS NOT DISTINCT FROM OLD.artist_a_id AND NEW.artist_b_id IS NOT DISTINCT FROM OLD.artist_b_id AND NEW.genre_agreed_a IS NOT DISTINCT FROM OLD.genre_agreed_a AND NEW.genre_agreed_b IS NOT DISTINCT FROM OLD.genre_agreed_b AND NEW.tournament_id IS NOT DISTINCT FROM OLD.tournament_id THEN RETURN NEW; END IF;
   previous_slot:=OLD.status IN ('pending','live') AND (OLD.status='live' OR (OLD.genre_agreed_a AND OLD.genre_agreed_b)) AND OLD.tournament_id IS NOT NULL;
  END IF;
  aid:=NEW.artist_a_id; bid:=NEW.artist_b_id; mid:=NEW.id;
  IF aid IS NULL OR bid IS NULL OR aid=bid THEN RAISE EXCEPTION 'Two different artists are required'; END IF;
  SELECT id INTO cid FROM public.battle_challenges WHERE status IN ('accepted','scheduled','live') AND challenger_id=aid AND challenged_id=bid AND genre IS NOT DISTINCT FROM NEW.genre AND (match_id=mid OR (match_id IS NULL AND (public.has_role(NEW.host_id,'host') OR public.has_role(NEW.host_id,'admin')))) LIMIT 1;
  linked_slot:=cid IS NOT NULL;
  IF NEW.status='live' AND NOT COALESCE(NEW.genre_agreed_a AND NEW.genre_agreed_b,false) THEN RAISE EXCEPTION 'Both artists must accept before starting'; END IF;
 ELSE
  IF NEW.status NOT IN ('pending','accepted','scheduled','live') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN previous_slot:=OLD.status IN ('accepted','scheduled','live') AND OLD.tournament_id IS NOT NULL; END IF;
  aid:=NEW.challenger_id; bid:=NEW.challenged_id; cid:=NEW.id; mid:=NEW.match_id;
 END IF;
 tid:=public.lock_battle_tournament();
 IF NEW.tournament_id IS NOT NULL AND NEW.tournament_id<>tid THEN RAISE EXCEPTION 'This tournament is closed'; END IF;
 NEW.tournament_id:=tid;
 IF TG_TABLE_NAME='battle_challenges' AND mid IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.battle_matches WHERE id=mid AND artist_a_id=aid AND artist_b_id=bid AND genre IS NOT DISTINCT FROM NEW.genre AND status IN ('pending','live')) THEN RAISE EXCEPTION 'Linked battle must match both artists and genre'; END IF;
  linked_slot:=EXISTS(SELECT 1 FROM public.battle_matches WHERE id=mid AND tournament_id=tid AND (status='live' OR (genre_agreed_a AND genre_agreed_b)));
 END IF;
 IF EXISTS(SELECT 1 FROM public.battle_tournament_eliminations WHERE tournament_id=tid AND artist_id IN(aid,bid)) THEN RAISE EXCEPTION 'An artist was eliminated from this tournament'; END IF;
 IF EXISTS(SELECT 1 FROM public.battle_challenges c WHERE c.status IN ('pending','accepted','scheduled','live') AND c.id IS DISTINCT FROM cid AND (c.challenger_id IN(aid,bid) OR c.challenged_id IN(aid,bid))) OR EXISTS(SELECT 1 FROM public.battle_matches m WHERE m.status IN ('pending','live') AND m.id IS DISTINCT FROM mid AND (m.artist_a_id IN(aid,bid) OR m.artist_b_id IN(aid,bid))) THEN RAISE EXCEPTION 'An artist already has a pending or active opponent'; END IF;
 filled:=public.battle_tournament_filled(tid);
 IF NOT previous_slot AND NOT linked_slot AND filled>=20 THEN RAISE EXCEPTION 'All 20 battle slots are filled'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.battle_challenges_sync_match() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('completed','cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
  UPDATE public.battle_challenges SET status=NEW.status,updated_at=now() WHERE match_id=NEW.id AND status IN ('pending','accepted','scheduled','live');
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.cancel_linked_challenge_match() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('cancelled','declined') AND NEW.status IS DISTINCT FROM OLD.status AND NEW.match_id IS NOT NULL THEN
  UPDATE public.battle_matches SET status='cancelled',ended_at=now(),active_side=NULL WHERE id=NEW.match_id AND status='pending';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.cancel_linked_challenge_match() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER cancel_linked_challenge AFTER UPDATE OF status ON public.battle_challenges FOR EACH ROW EXECUTE FUNCTION public.cancel_linked_challenge_match();
CREATE OR REPLACE FUNCTION public.enqueue_matchmaking(_tier text DEFAULT NULL,_genre text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); xp integer; tier text; new_id uuid; state jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 PERFORM public.lock_battle_tournament();
 state:=public.get_battle_tournament_state();
 IF NOT (state->>'canSubmit')::boolean THEN RAISE EXCEPTION 'Finish your current matchup or wait for tournament eligibility and an available slot'; END IF;
 IF _genre IS NOT NULL AND NOT public.is_valid_battle_genre(_genre) THEN RAISE EXCEPTION 'Invalid battle genre'; END IF;
 xp:=public.get_user_xp(uid); tier:=COALESCE(_tier,lower(public.get_user_rank(uid)));
 INSERT INTO public.matchmaking_pool(user_id,tier,xp_snapshot,status,genre) VALUES(uid,tier,xp,'waiting',_genre) ON CONFLICT(user_id) WHERE status='waiting' DO UPDATE SET tier=EXCLUDED.tier,xp_snapshot=EXCLUDED.xp_snapshot,genre=EXCLUDED.genre,updated_at=now() RETURNING id INTO new_id;
 RETURN new_id;
END $$;