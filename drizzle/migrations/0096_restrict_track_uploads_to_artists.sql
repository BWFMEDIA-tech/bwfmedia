CREATE OR REPLACE FUNCTION public.get_song_upload_allowance()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); used integer; limited boolean; paid boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
 IF NOT public.has_role(uid, 'artist'::public.app_role) AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
  RAISE EXCEPTION 'Listener accounts cannot upload tracks. Activate your artist profile to upload music.' USING ERRCODE = '42501';
 END IF;
 SELECT count(*) INTO used FROM public.song_upload_usage WHERE user_id = uid;
 SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = uid AND environment = 'live'
 AND (plan_type IN ('artist_pro','label_plan') OR price_id IN ('artist_monthly','artist_pro','label_plan'))
 AND ((status IN ('trialing','active','past_due') AND (current_period_end IS NULL OR current_period_end > now())) OR (status = 'canceled' AND current_period_end > now()))) INTO paid;
 limited := public.has_role(uid, 'artist'::public.app_role) AND NOT paid;
 RETURN jsonb_build_object('limit', CASE WHEN limited THEN 5 ELSE NULL END, 'used', used, 'remaining', CASE WHEN limited THEN greatest(0,5-used) ELSE NULL END);
END;
$$;

REVOKE ALL ON FUNCTION public.get_song_upload_allowance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_song_upload_allowance() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_starter_song_upload_allowance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE key text := split_part(NEW.audio_url, '?', 1); used integer; paid boolean;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.artist_user_id IS DISTINCT FROM OLD.artist_user_id THEN
   RAISE EXCEPTION 'Song ownership cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF split_part(NEW.audio_url, '?', 1) IS NOT DISTINCT FROM split_part(OLD.audio_url, '?', 1) THEN RETURN NEW; END IF;
 END IF;
 IF NEW.artist_user_id IS NULL OR nullif(btrim(key), '') IS NULL THEN RETURN NEW; END IF;
 IF NOT public.has_role(NEW.artist_user_id, 'artist'::public.app_role) AND NOT public.has_role(NEW.artist_user_id, 'admin'::public.app_role) THEN
  RAISE EXCEPTION 'Listener accounts cannot upload tracks. Activate your artist profile to upload music.' USING ERRCODE = '42501';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('song-upload:' || NEW.artist_user_id::text, 0));
 IF EXISTS (SELECT 1 FROM public.song_upload_usage WHERE user_id = NEW.artist_user_id AND audio_key = key) THEN RETURN NEW; END IF;
 SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.artist_user_id AND environment = 'live'
 AND (plan_type IN ('artist_pro','label_plan') OR price_id IN ('artist_monthly','artist_pro','label_plan'))
 AND ((status IN ('trialing','active','past_due') AND (current_period_end IS NULL OR current_period_end > now())) OR (status = 'canceled' AND current_period_end > now()))) INTO paid;
 IF public.has_role(NEW.artist_user_id, 'artist'::public.app_role) AND NOT paid THEN
  SELECT count(*) INTO used FROM public.song_upload_usage WHERE user_id = NEW.artist_user_id;
  IF used >= 5 THEN
   RAISE EXCEPTION 'You''ve reached your 5-song upload limit. Upgrade your plan to upload more music.' USING ERRCODE = 'P0001';
  END IF;
 END IF;
 INSERT INTO public.song_upload_usage (user_id, audio_key) VALUES (NEW.artist_user_id, key);
 RETURN NEW;
END;
$$;

DROP POLICY "Authenticated can upload play audio" ON storage.objects;
CREATE POLICY "Authenticated can upload play audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
 bucket_id = 'artist-audio'
 AND (storage.foldername(name))[1] = 'play'
 AND (storage.foldername(name))[2] = auth.uid()::text
 AND (public.has_role(auth.uid(), 'artist'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);