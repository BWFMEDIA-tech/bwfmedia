CREATE OR REPLACE FUNCTION public.battle_tournament_notifications() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid; title_text text; body_text text; event_key text; loser uuid;
BEGIN
 IF TG_TABLE_NAME='battle_challenges' THEN
  IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NEW; END IF;
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
CREATE TRIGGER tournament_challenge_insert_notification AFTER INSERT ON public.battle_challenges FOR EACH ROW EXECUTE FUNCTION public.battle_tournament_notifications();
CREATE TRIGGER tournament_schedule_change_notification AFTER UPDATE OF scheduled_at ON public.battle_challenges FOR EACH ROW WHEN (NEW.status='scheduled' AND NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at) EXECUTE FUNCTION public.battle_tournament_notifications();
CREATE FUNCTION public.serialize_battle_tournament_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(723941802);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.serialize_battle_tournament_write() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER aaa_tournament_write_lock BEFORE INSERT OR UPDATE ON public.battle_challenges FOR EACH ROW EXECUTE FUNCTION public.serialize_battle_tournament_write();
CREATE TRIGGER aaa_tournament_write_lock BEFORE INSERT OR UPDATE ON public.battle_matches FOR EACH ROW EXECUTE FUNCTION public.serialize_battle_tournament_write();