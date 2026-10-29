CREATE TABLE public.video_upload_usage (
 user_id uuid NOT NULL,
 month_start date NOT NULL,
 upload_count integer NOT NULL DEFAULT 0 CHECK (upload_count >= 0),
 PRIMARY KEY (user_id, month_start)
);
GRANT SELECT ON public.video_upload_usage TO authenticated;
GRANT ALL ON public.video_upload_usage TO service_role;
ALTER TABLE public.video_upload_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own video upload usage" ON public.video_upload_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.video_upload_usage (user_id, month_start, upload_count)
SELECT user_id, date_trunc('month', created_at AT TIME ZONE 'America/Chicago')::date, count(*)::integer FROM public.videos GROUP BY 1,2;
CREATE OR REPLACE FUNCTION public.enforce_video_upload_allowance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_month date := date_trunc('month', now() AT TIME ZONE 'America/Chicago')::date; used integer;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Video owner and upload date cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
 END IF;
 IF NOT (public.has_role(NEW.user_id, 'artist'::public.app_role) OR public.has_role(NEW.user_id, 'admin'::public.app_role)) THEN
  RAISE EXCEPTION 'An artist account is required to upload videos' USING ERRCODE = '42501';
 END IF;
 IF auth.uid() IS NOT NULL AND auth.uid() <> NEW.user_id THEN
  RAISE EXCEPTION 'You can only upload your own videos' USING ERRCODE = '42501';
 END IF;
 INSERT INTO public.video_upload_usage AS usage (user_id, month_start, upload_count)
 VALUES (NEW.user_id, current_month, 1)
 ON CONFLICT (user_id, month_start) DO UPDATE SET upload_count = usage.upload_count + 1
 WHERE usage.upload_count < 2
 RETURNING upload_count INTO used;
 IF used IS NULL THEN
  RAISE EXCEPTION 'Monthly video limit reached: artists can upload 2 videos per calendar month. Your allowance resets on the first of next month (Chicago time).' USING ERRCODE = 'P0001';
 END IF;
 NEW.created_at := now();
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_video_upload_allowance() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_video_upload_allowance BEFORE INSERT OR UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.enforce_video_upload_allowance();
CREATE OR REPLACE FUNCTION public.get_video_upload_allowance()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); current_month date := date_trunc('month', now() AT TIME ZONE 'America/Chicago')::date; used integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to upload videos' USING ERRCODE = '42501'; END IF;
 IF NOT (public.has_role(uid, 'artist'::public.app_role) OR public.has_role(uid, 'admin'::public.app_role)) THEN
  RAISE EXCEPTION 'An artist account is required to upload videos' USING ERRCODE = '42501';
 END IF;
 SELECT upload_count INTO used FROM public.video_upload_usage WHERE user_id = uid AND month_start = current_month;
 RETURN jsonb_build_object('limit', 2, 'used', coalesce(used, 0), 'remaining', greatest(0, 2 - coalesce(used,0)), 'resetsAt', ((current_month + interval '1 month')::timestamp AT TIME ZONE 'America/Chicago'));
END;
$$;
REVOKE ALL ON FUNCTION public.get_video_upload_allowance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_video_upload_allowance() TO authenticated;
COMMENT ON TABLE public.video_upload_usage IS 'Monthly video upload counts retained after video deletion; all artist accounts receive two uploads per Chicago calendar month.';