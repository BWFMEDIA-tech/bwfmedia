CREATE OR REPLACE FUNCTION public.label_owner_grant_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NEW.role::text = 'owner'
     AND (TG_OP = 'INSERT' OR OLD.role::text IS DISTINCT FROM 'owner')
     AND NOT public.has_label_access(NEW.label_id, auth.uid(), ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only a label owner can grant ownership';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS label_members_owner_guard ON public.label_members;
CREATE TRIGGER label_members_owner_guard BEFORE INSERT OR UPDATE ON public.label_members
FOR EACH ROW EXECUTE FUNCTION public.label_owner_grant_guard();
DROP TRIGGER IF EXISTS label_invites_owner_guard ON public.label_invites;
CREATE TRIGGER label_invites_owner_guard BEFORE INSERT OR UPDATE ON public.label_invites
FOR EACH ROW EXECUTE FUNCTION public.label_owner_grant_guard();

CREATE OR REPLACE FUNCTION public.stream_recordings_path_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND (NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.host_id IS DISTINCT FROM OLD.host_id) THEN
    RAISE EXCEPTION 'Recording path and owner cannot be changed';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stream_recordings_path_guard ON public.stream_recordings;
CREATE TRIGGER stream_recordings_path_guard BEFORE UPDATE ON public.stream_recordings
FOR EACH ROW EXECUTE FUNCTION public.stream_recordings_path_guard();