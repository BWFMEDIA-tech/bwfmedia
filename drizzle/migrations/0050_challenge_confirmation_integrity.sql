CREATE OR REPLACE FUNCTION public.validate_challenge_confirmation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('app.confirmed_challenge_bridge',true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status <> 'pending' OR NEW.challenger_id <> auth.uid() OR NEW.match_id IS NOT NULL OR NEW.stream_id IS NOT NULL OR NEW.scheduled_at IS NOT NULL THEN
        RAISE EXCEPTION 'New challenges must wait for artist acceptance';
      END IF;
    ELSIF OLD.status = 'pending' AND NEW.status IN ('accepted','scheduled','live') THEN
      IF NEW.status <> 'accepted' OR auth.uid() <> OLD.challenged_id THEN RAISE EXCEPTION 'Only the challenged artist can accept'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_challenge_confirmation_trg BEFORE INSERT OR UPDATE ON public.battle_challenges FOR EACH ROW EXECUTE FUNCTION public.validate_challenge_confirmation();
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
      PERFORM set_config('app.confirmed_challenge_bridge','on',true);
      INSERT INTO public.battle_challenges(challenger_id,challenged_id,genre,status,match_id,stream_id)
      VALUES(NEW.artist_a_id,NEW.artist_b_id,NEW.genre,'accepted',NEW.id,NEW.stream_id);
      PERFORM set_config('app.confirmed_challenge_bridge','off',true);
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_challenge_confirmation() FROM PUBLIC,anon,authenticated;