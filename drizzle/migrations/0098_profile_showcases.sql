ALTER TABLE public.events ADD COLUMN IF NOT EXISTS label_id uuid REFERENCES public.labels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS events_creator_start_idx ON public.events(created_by, starts_at);
CREATE INDEX IF NOT EXISTS events_label_start_idx ON public.events(label_id, starts_at);
CREATE OR REPLACE FUNCTION public.can_manage_profile_events() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(auth.uid(),'artist') OR public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.label_members WHERE user_id=auth.uid() AND role IN ('owner','manager')) $$;
REVOKE ALL ON FUNCTION public.can_manage_profile_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_profile_events() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.profile_event_write_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF TG_OP='UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Event ownership cannot change'; END IF;
IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
 IF NOT public.can_manage_profile_events() THEN RAISE EXCEPTION 'Artist or label manager access required'; END IF;
 IF NEW.label_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.label_members WHERE label_id=NEW.label_id AND user_id=auth.uid() AND role IN ('owner','manager')) THEN RAISE EXCEPTION 'Label manager access required'; END IF;
END IF;
IF NEW.cover_image_url IS NOT NULL AND NEW.cover_image_url NOT LIKE 'https://%' AND (split_part(NEW.cover_image_url,'/',1)<>NEW.created_by::text OR NEW.cover_image_url LIKE '%..%') THEN RAISE EXCEPTION 'Flyer must belong to the event creator'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER profile_event_write_guard BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.profile_event_write_guard();
DROP POLICY "Users can create own events" ON public.events;
CREATE POLICY "Users can create own events" ON public.events FOR INSERT TO authenticated WITH CHECK ((select auth.uid())=created_by AND (select public.can_manage_profile_events()));
CREATE POLICY "Event flyer upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='event-flyers' AND (storage.foldername(name))[1]=(select auth.uid())::text AND (select public.can_manage_profile_events()));
CREATE POLICY "Event flyer owner read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='event-flyers' AND (storage.foldername(name))[1]=(select auth.uid())::text);
CREATE POLICY "Event flyer public read" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='event-flyers' AND EXISTS(SELECT 1 FROM public.events e WHERE e.cover_image_url=name AND e.created_by::text=(storage.foldername(name))[1] AND e.status IN ('scheduled','live','ended')));
CREATE POLICY "Event flyer owner delete" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='event-flyers' AND (storage.foldername(name))[1]=(select auth.uid())::text);
CREATE OR REPLACE FUNCTION public.list_label_showcases(_label_id uuid) RETURNS SETOF public.events LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT e.* FROM public.events e WHERE e.status IN ('scheduled','live','ended') AND (e.label_id=_label_id OR e.created_by IN (SELECT artist_id FROM public.label_artists WHERE label_id=_label_id AND status='active')) ORDER BY e.starts_at LIMIT 200 $$;
REVOKE ALL ON FUNCTION public.list_label_showcases(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_label_showcases(uuid) TO anon,authenticated,service_role;