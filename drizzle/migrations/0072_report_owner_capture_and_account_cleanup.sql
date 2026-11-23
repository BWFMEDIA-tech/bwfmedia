CREATE OR REPLACE FUNCTION public.validate_content_report() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE snapshot jsonb;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;
  NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
  RETURN NEW;
 END IF;
 IF auth.uid() IS NULL OR NEW.reporter_id <> auth.uid() THEN RAISE EXCEPTION 'Sign in to report content' USING ERRCODE = '42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('content-report:' || auth.uid()::text, 0));
 IF (SELECT count(*) FROM public.moderation_reports WHERE reporter_id = auth.uid() AND created_at > now() - interval '1 hour') >= 10 THEN RAISE EXCEPTION 'Report limit reached. Please try again later.'; END IF;
 IF EXISTS (SELECT 1 FROM public.moderation_reports WHERE reporter_id = auth.uid() AND target_type = NEW.target_type AND target_id = NEW.target_id AND status IN ('pending','reviewing')) THEN RAISE EXCEPTION 'You already reported this content'; END IF;
 CASE NEW.target_type
 WHEN 'direct_message' THEN SELECT to_jsonb(m), m.sender_id INTO snapshot, NEW.target_user_id FROM public.direct_messages m WHERE m.id = NEW.target_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid());
 WHEN 'live_message' THEN SELECT to_jsonb(m), m.user_id INTO snapshot, NEW.target_user_id FROM public.stream_messages m WHERE m.id = NEW.target_id;
 WHEN 'track' THEN SELECT to_jsonb(t), t.artist_user_id INTO snapshot, NEW.target_user_id FROM public.play_tracks t WHERE t.id = NEW.target_id;
 WHEN 'stream' THEN SELECT to_jsonb(s), s.host_id INTO snapshot, NEW.target_user_id FROM public.streams s WHERE s.id = NEW.target_id;
 WHEN 'profile' THEN SELECT to_jsonb(p), p.id INTO snapshot, NEW.target_user_id FROM public.public_profiles p WHERE p.id = NEW.target_id;
 END CASE;
 IF snapshot IS NULL THEN RAISE EXCEPTION 'This content is unavailable for reporting'; END IF;
 NEW.evidence := left(coalesce(snapshot->>'body',snapshot->>'title',snapshot->>'display_name','Content reported'),4000);
 NEW.created_at := now();
 RETURN NEW;
END $$;
CREATE FUNCTION public.cleanup_profile_safety_data() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 DELETE FROM public.user_blocks WHERE blocker_id = OLD.id OR blocked_id = OLD.id;
 DELETE FROM public.moderation_reports WHERE reporter_id = OLD.id OR target_user_id = OLD.id;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_profile_safety_data() FROM PUBLIC;
CREATE TRIGGER profiles_safety_cleanup BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.cleanup_profile_safety_data();