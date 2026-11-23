CREATE TABLE public.user_blocks (
 blocker_id uuid NOT NULL DEFAULT auth.uid(),
 blocked_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (blocker_id, blocked_id),
 CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocks_read_own ON public.user_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY blocks_insert_own ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid() AND EXISTS (SELECT 1 FROM public.public_profiles p WHERE p.id = blocked_id));
CREATE POLICY blocks_delete_own ON public.user_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());
CREATE INDEX user_blocks_reverse_idx ON public.user_blocks (blocked_id, blocker_id);
CREATE FUNCTION public.enforce_personal_dm_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(least(NEW.sender_id::text,NEW.recipient_id::text) || ':' || greatest(NEW.sender_id::text,NEW.recipient_id::text), 0));
 IF EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id = NEW.sender_id AND b.blocked_id = NEW.recipient_id) OR (b.blocker_id = NEW.recipient_id AND b.blocked_id = NEW.sender_id)) THEN
  RAISE EXCEPTION 'Messaging is unavailable for this conversation' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_personal_dm_block() FROM PUBLIC;
CREATE TRIGGER direct_messages_personal_block BEFORE INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_personal_dm_block();
CREATE FUNCTION public.lock_personal_block_pair() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(least(NEW.blocker_id::text,NEW.blocked_id::text) || ':' || greatest(NEW.blocker_id::text,NEW.blocked_id::text), 0));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lock_personal_block_pair() FROM PUBLIC;
CREATE TRIGGER user_blocks_pair_lock BEFORE INSERT ON public.user_blocks FOR EACH ROW EXECUTE FUNCTION public.lock_personal_block_pair();
CREATE POLICY personal_live_chat_visibility ON public.stream_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = stream_messages.user_id));
CREATE TABLE public.moderation_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id uuid NOT NULL DEFAULT auth.uid(),
 target_type text NOT NULL CHECK (target_type IN ('direct_message','live_message','track','stream','profile')),
 target_id uuid NOT NULL,
 category text NOT NULL CHECK (category IN ('inappropriate','harassment','spam','copyright')),
 details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
 evidence text NOT NULL DEFAULT '',
 target_user_id uuid,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
 review_note text NOT NULL DEFAULT '' CHECK (char_length(review_note) <= 2000),
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_reports TO authenticated;
GRANT UPDATE (status, review_note, reviewed_by, reviewed_at) ON public.moderation_reports TO authenticated;
GRANT ALL ON public.moderation_reports TO service_role;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_read_own_or_admin ON public.moderation_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY reports_create_own ON public.moderation_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'pending' AND review_note = '' AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE POLICY reports_admin_review ON public.moderation_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX moderation_reports_queue_idx ON public.moderation_reports (status, created_at DESC);
CREATE INDEX moderation_reports_reporter_idx ON public.moderation_reports (reporter_id, created_at DESC);
CREATE FUNCTION public.validate_content_report() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
 WHEN 'track' THEN SELECT to_jsonb(t) INTO snapshot FROM public.play_tracks t WHERE t.id = NEW.target_id;
 WHEN 'stream' THEN SELECT to_jsonb(s), s.host_id INTO snapshot, NEW.target_user_id FROM public.streams s WHERE s.id = NEW.target_id;
 WHEN 'profile' THEN SELECT to_jsonb(p), p.id INTO snapshot, NEW.target_user_id FROM public.public_profiles p WHERE p.id = NEW.target_id;
 END CASE;
 IF snapshot IS NULL THEN RAISE EXCEPTION 'This content is unavailable for reporting'; END IF;
 IF NEW.target_type = 'track' THEN NEW.target_user_id := NULLIF(snapshot->>'artist_id','')::uuid; END IF;
 NEW.evidence := left(coalesce(snapshot->>'body',snapshot->>'title',snapshot->>'display_name','Content reported'),4000);
 NEW.created_at := now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_content_report() FROM PUBLIC;
CREATE TRIGGER moderation_reports_validate BEFORE INSERT OR UPDATE ON public.moderation_reports FOR EACH ROW EXECUTE FUNCTION public.validate_content_report();