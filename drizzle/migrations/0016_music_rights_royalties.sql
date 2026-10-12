CREATE TABLE public.rights_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization text NOT NULL CHECK (organization IN ('copyright_office','ascap','bmi','songtrust','soundexchange','mlc')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','verified','issue')),
  member_id text, reference text, applied_at date,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text, admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization)
);
CREATE TABLE public.song_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.play_tracks(id) ON DELETE CASCADE,
  iswc text, isrc text, publisher text,
  registration_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','verified','issue')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id)
);
CREATE TABLE public.song_rights_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_rights_id uuid NOT NULL REFERENCES public.song_rights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  role text NOT NULL DEFAULT 'writer' CHECK (role IN ('writer','publisher','producer','composer')),
  ipi text,
  share_pct numeric(5,2) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rights_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_rights_id uuid REFERENCES public.song_rights(id) ON DELETE CASCADE,
  organization text,
  description text NOT NULL CHECK (length(description) BETWEEN 3 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rights_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL, summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.royalty_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization text NOT NULL,
  period text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rights_registrations, public.song_rights, public.song_rights_splits, public.rights_disputes, public.royalty_statements TO authenticated;
GRANT SELECT ON public.rights_activity TO authenticated;
GRANT ALL ON public.rights_registrations, public.song_rights, public.song_rights_splits, public.rights_disputes, public.rights_activity, public.royalty_statements TO service_role;

ALTER TABLE public.rights_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_rights_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalty_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or admin read" ON public.rights_registrations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own insert" ON public.rights_registrations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status <> 'verified');
CREATE POLICY "own update" ON public.rights_registrations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own delete" ON public.rights_registrations FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own or admin read" ON public.song_rights FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own insert" ON public.song_rights FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.play_tracks t WHERE t.id = track_id AND t.artist_user_id = auth.uid()));
CREATE POLICY "own update" ON public.song_rights FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own delete" ON public.song_rights FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own or admin read" ON public.song_rights_splits FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own insert" ON public.song_rights_splits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.song_rights s WHERE s.id = song_rights_id AND s.user_id = auth.uid()));
CREATE POLICY "own update" ON public.song_rights_splits FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own delete" ON public.song_rights_splits FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own or admin read" ON public.rights_disputes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own insert" ON public.rights_disputes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open');
CREATE POLICY "own delete" ON public.rights_disputes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own read" ON public.rights_activity FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "own read" ON public.royalty_statements FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own insert" ON public.royalty_statements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own delete" ON public.royalty_statements FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Artists may not self-verify; only service role (admin server fn) may set verified or admin_note
CREATE OR REPLACE FUNCTION public.rights_guard_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.status = 'verified' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'verified') THEN
      RAISE EXCEPTION 'Only Tunevio admins can mark items verified';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.user_id <> OLD.user_id THEN RAISE EXCEPTION 'Ownership is immutable'; END IF;
      IF TG_TABLE_NAME = 'rights_registrations' AND NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN NEW.admin_note := OLD.admin_note; END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER rights_registrations_guard BEFORE INSERT OR UPDATE ON public.rights_registrations FOR EACH ROW EXECUTE FUNCTION public.rights_guard_status();
CREATE TRIGGER song_rights_guard BEFORE INSERT OR UPDATE ON public.song_rights FOR EACH ROW EXECUTE FUNCTION public.rights_guard_status();

CREATE OR REPLACE FUNCTION public.song_rights_splits_check() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric;
BEGIN
  SELECT coalesce(sum(share_pct),0) INTO total FROM public.song_rights_splits WHERE song_rights_id = NEW.song_rights_id AND id <> NEW.id;
  IF total + NEW.share_pct > 100 THEN RAISE EXCEPTION 'Ownership splits cannot exceed 100%%'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER song_rights_splits_total BEFORE INSERT OR UPDATE ON public.song_rights_splits FOR EACH ROW EXECUTE FUNCTION public.song_rights_splits_check();

CREATE OR REPLACE FUNCTION public.rights_log_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org text; msg text;
BEGIN
  IF TG_TABLE_NAME = 'rights_registrations' THEN
    org := CASE NEW.organization WHEN 'copyright_office' THEN 'Copyright Office' WHEN 'ascap' THEN 'ASCAP' WHEN 'bmi' THEN 'BMI' WHEN 'songtrust' THEN 'Songtrust' WHEN 'soundexchange' THEN 'SoundExchange' ELSE 'The MLC' END;
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    msg := org || ' registration ' || replace(NEW.status,'_',' ');
    INSERT INTO public.rights_activity(user_id, kind, summary) VALUES (NEW.user_id, NEW.status, msg);
  ELSIF TG_TABLE_NAME = 'rights_disputes' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.rights_activity(user_id, kind, summary) VALUES (NEW.user_id, 'issue', 'Rights dispute opened');
  ELSIF TG_TABLE_NAME = 'song_rights' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.rights_activity(user_id, kind, summary) VALUES (NEW.user_id, 'in_progress', 'Song rights record created');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.rights_log_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rights_registrations_activity AFTER INSERT OR UPDATE ON public.rights_registrations FOR EACH ROW EXECUTE FUNCTION public.rights_log_activity();
CREATE TRIGGER rights_disputes_activity AFTER INSERT ON public.rights_disputes FOR EACH ROW EXECUTE FUNCTION public.rights_log_activity();
CREATE TRIGGER song_rights_activity AFTER INSERT ON public.song_rights FOR EACH ROW EXECUTE FUNCTION public.rights_log_activity();