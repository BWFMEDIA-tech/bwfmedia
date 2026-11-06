ALTER TABLE public.battle_matches
  ADD COLUMN IF NOT EXISTS genre text,
  ADD COLUMN IF NOT EXISTS genre_agreed_a boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS genre_agreed_b boolean NOT NULL DEFAULT false;
ALTER TABLE public.matchmaking_pool ADD COLUMN IF NOT EXISTS genre text;
CREATE INDEX IF NOT EXISTS battle_matches_genre_idx ON public.battle_matches(genre, status);
CREATE INDEX IF NOT EXISTS matchmaking_pool_genre_idx ON public.matchmaking_pool(genre, status);

CREATE OR REPLACE FUNCTION public.is_valid_battle_genre(_g text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _g IN ('Hip-Hop / Rap','R&B','Trap','Drill','Pop','Gospel','Country','Rock','Afrobeat','Dancehall / Reggae','Latin','Electronic / EDM','Jazz','Other')
$$;

-- Agreement flags can only be set by the artist themselves (via agree_battle_genre).
-- Changing genre or artists resets agreement. The artist who creates the match agrees automatically.
CREATE OR REPLACE FUNCTION public.battle_matches_genre_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); trusted boolean := current_setting('app.genre_agree', true) = 'on';
BEGIN
  IF NEW.genre IS NOT NULL AND NOT public.is_valid_battle_genre(NEW.genre) THEN
    RAISE EXCEPTION 'Invalid battle genre';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.genre_agreed_a := (uid IS NOT NULL AND uid = NEW.artist_a_id);
    NEW.genre_agreed_b := (uid IS NOT NULL AND uid = NEW.artist_b_id);
    RETURN NEW;
  END IF;
  IF NEW.genre IS DISTINCT FROM OLD.genre THEN
    IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'Genre is locked once the battle starts'; END IF;
    NEW.genre_agreed_a := (uid = NEW.artist_a_id); NEW.genre_agreed_b := (uid = NEW.artist_b_id);
    RETURN NEW;
  END IF;
  IF NEW.artist_a_id IS DISTINCT FROM OLD.artist_a_id THEN NEW.genre_agreed_a := (uid = NEW.artist_a_id); 
  ELSIF NOT trusted AND NEW.genre_agreed_a IS DISTINCT FROM OLD.genre_agreed_a AND uid IS NOT NULL THEN NEW.genre_agreed_a := OLD.genre_agreed_a; END IF;
  IF NEW.artist_b_id IS DISTINCT FROM OLD.artist_b_id THEN NEW.genre_agreed_b := (uid = NEW.artist_b_id);
  ELSIF NOT trusted AND NEW.genre_agreed_b IS DISTINCT FROM OLD.genre_agreed_b AND uid IS NOT NULL THEN NEW.genre_agreed_b := OLD.genre_agreed_b; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS battle_matches_genre_guard ON public.battle_matches;
CREATE TRIGGER battle_matches_genre_guard BEFORE INSERT OR UPDATE ON public.battle_matches
FOR EACH ROW EXECUTE FUNCTION public.battle_matches_genre_guard();

CREATE OR REPLACE FUNCTION public.agree_battle_genre(_match_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); m record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  SELECT * INTO m FROM public.battle_matches WHERE id = _match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF m.status <> 'pending' THEN RAISE EXCEPTION 'Battle already started'; END IF;
  IF uid <> m.artist_a_id AND uid <> m.artist_b_id THEN RAISE EXCEPTION 'Only the battling artists can agree'; END IF;
  PERFORM set_config('app.genre_agree', 'on', true);
  UPDATE public.battle_matches SET
    genre_agreed_a = CASE WHEN uid = artist_a_id THEN true ELSE genre_agreed_a END,
    genre_agreed_b = CASE WHEN uid = artist_b_id THEN true ELSE genre_agreed_b END
  WHERE id = _match_id;
  PERFORM set_config('app.genre_agree', 'off', true);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.agree_battle_genre(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agree_battle_genre(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_matchmaking(_tier text DEFAULT NULL::text, _genre text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); xp int; tier text; new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  IF _genre IS NOT NULL AND NOT public.is_valid_battle_genre(_genre) THEN RAISE EXCEPTION 'Invalid battle genre'; END IF;
  xp := public.get_user_xp(uid);
  tier := COALESCE(_tier, lower(public.get_user_rank(uid)));
  INSERT INTO public.matchmaking_pool(user_id, tier, xp_snapshot, status, genre)
  VALUES (uid, tier, xp, 'waiting', _genre)
  ON CONFLICT (user_id) WHERE status = 'waiting'
  DO UPDATE SET tier = EXCLUDED.tier, xp_snapshot = EXCLUDED.xp_snapshot, genre = EXCLUDED.genre, updated_at = now()
  RETURNING id INTO new_id;
  RETURN new_id;
END $function$;
DROP FUNCTION IF EXISTS public.enqueue_matchmaking(text);
GRANT EXECUTE ON FUNCTION public.enqueue_matchmaking(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_matchmaking(text, text) FROM anon, PUBLIC;

-- Public-safe list of artists waiting for a battle (no timestamps beyond wait start, no private data).
CREATE OR REPLACE FUNCTION public.list_battle_challengers(_genre text DEFAULT NULL)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, genre text, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT mp.user_id, COALESCE(p.stage_name, p.display_name, 'Artist'), p.avatar_url, mp.genre, mp.tier
  FROM public.matchmaking_pool mp
  JOIN public.profiles p ON p.id = mp.user_id
  WHERE mp.status = 'waiting' AND mp.genre IS NOT NULL
    AND (_genre IS NULL OR mp.genre = _genre)
    AND mp.enqueued_at > now() - interval '24 hours'
  ORDER BY mp.enqueued_at ASC
  LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.list_battle_challengers(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_battle_challengers(text) TO authenticated;