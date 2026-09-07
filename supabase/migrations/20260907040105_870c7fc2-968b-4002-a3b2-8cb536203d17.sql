CREATE TYPE public.label_role AS ENUM ('owner','manager','anr','finance');

CREATE TABLE public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  bio text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labels TO authenticated;
GRANT SELECT ON public.labels TO anon;
GRANT ALL ON public.labels TO service_role;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.label_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.label_role NOT NULL DEFAULT 'manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (label_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_members TO authenticated;
GRANT ALL ON public.label_members TO service_role;
ALTER TABLE public.label_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.label_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (label_id, artist_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_artists TO authenticated;
GRANT ALL ON public.label_artists TO service_role;
ALTER TABLE public.label_artists ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.label_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'team',
  role public.label_role NOT NULL DEFAULT 'manager',
  email text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  accepted_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_invites TO authenticated;
GRANT ALL ON public.label_invites TO service_role;
ALTER TABLE public.label_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.label_role_of(_label_id uuid, _user_id uuid)
RETURNS public.label_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.label_members WHERE label_id = _label_id AND user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_label_access(_label_id uuid, _user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.label_members m
    WHERE m.label_id = _label_id AND m.user_id = _user_id
      AND (_roles IS NULL OR m.role::text = ANY(_roles))
  )
$$;

CREATE OR REPLACE FUNCTION public.label_manages_artist(_user_id uuid, _artist_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.label_artists la
    JOIN public.label_members m ON m.label_id = la.label_id
    WHERE la.artist_id = _artist_id AND la.status = 'active'
      AND m.user_id = _user_id
      AND (_roles IS NULL OR m.role::text = ANY(_roles))
  )
$$;

CREATE POLICY "labels public read" ON public.labels FOR SELECT USING (true);
CREATE POLICY "labels owner insert" ON public.labels FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "labels managers update" ON public.labels FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_label_access(id, auth.uid(), ARRAY['owner','manager']))
  WITH CHECK (owner_id = auth.uid() OR public.has_label_access(id, auth.uid(), ARRAY['owner','manager']));
CREATE POLICY "labels owner delete" ON public.labels FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "label_members read" ON public.label_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_label_access(label_id, auth.uid(), NULL));
CREATE POLICY "label_members manage" ON public.label_members FOR ALL TO authenticated
  USING (public.has_label_access(label_id, auth.uid(), ARRAY['owner','manager']))
  WITH CHECK (public.has_label_access(label_id, auth.uid(), ARRAY['owner','manager']));

CREATE POLICY "label_artists read" ON public.label_artists FOR SELECT TO authenticated
  USING (artist_id = auth.uid() OR public.has_label_access(label_id, auth.uid(), NULL));
CREATE POLICY "label_artists manage" ON public.label_artists FOR ALL TO authenticated
  USING (public.has_label_access(label_id, auth.uid(), ARRAY['owner','manager','anr']))
  WITH CHECK (public.has_label_access(label_id, auth.uid(), ARRAY['owner','manager','anr']));
CREATE POLICY "label_artists self update" ON public.label_artists FOR UPDATE TO authenticated
  USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());

CREATE POLICY "label_invites read" ON public.label_invites FOR SELECT TO authenticated
  USING (public.has_label_access(label_id, auth.uid(), NULL) OR accepted_by = auth.uid());
CREATE POLICY "label_invites manage" ON public.label_invites FOR ALL TO authenticated
  USING (public.has_label_access(label_id, auth.uid(), ARRAY['owner','manager']))
  WITH CHECK (public.has_label_access(label_id, auth.uid(), ARRAY['owner','manager']) AND created_by = auth.uid());

CREATE POLICY "label team can view roster releases" ON public.distribution_releases FOR SELECT TO authenticated
  USING (public.label_manages_artist(auth.uid(), user_id, NULL));
CREATE POLICY "label managers can edit roster releases" ON public.distribution_releases FOR UPDATE TO authenticated
  USING (public.label_manages_artist(auth.uid(), user_id, ARRAY['owner','manager']))
  WITH CHECK (public.label_manages_artist(auth.uid(), user_id, ARRAY['owner','manager']));

CREATE TRIGGER labels_touch BEFORE UPDATE ON public.labels FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER label_members_touch BEFORE UPDATE ON public.label_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER label_artists_touch BEFORE UPDATE ON public.label_artists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER label_invites_touch BEFORE UPDATE ON public.label_invites FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.create_label(_name text, _slug text DEFAULT NULL, _bio text DEFAULT NULL, _website text DEFAULT NULL, _logo_url text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.labels (owner_id, name, slug, bio, website, logo_url)
  VALUES (_uid, _name, NULLIF(_slug,''), _bio, _website, _logo_url)
  RETURNING id INTO _id;
  INSERT INTO public.label_members (label_id, user_id, role) VALUES (_id, _uid, 'owner');
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.accept_label_invite(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.label_invites; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _inv FROM public.label_invites WHERE code = _code;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'invite not found'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'invite already used'; END IF;
  IF _inv.expires_at < now() THEN RAISE EXCEPTION 'invite expired'; END IF;

  IF _inv.kind = 'artist' THEN
    INSERT INTO public.label_artists (label_id, artist_id, status, invited_by)
    VALUES (_inv.label_id, _uid, 'active', _inv.created_by)
    ON CONFLICT (label_id, artist_id) DO UPDATE SET status = 'active', updated_at = now();
  ELSE
    INSERT INTO public.label_members (label_id, user_id, role)
    VALUES (_inv.label_id, _uid, _inv.role)
    ON CONFLICT (label_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();
  END IF;

  UPDATE public.label_invites SET status = 'accepted', accepted_by = _uid, updated_at = now() WHERE id = _inv.id;
  RETURN jsonb_build_object('ok', true, 'label_id', _inv.label_id, 'kind', _inv.kind);
END $$;

CREATE OR REPLACE FUNCTION public.get_my_labels()
RETURNS TABLE(label_id uuid, name text, slug text, logo_url text, role public.label_role, roster_count integer, member_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.name, l.slug, l.logo_url, m.role,
    (SELECT count(*)::int FROM public.label_artists la WHERE la.label_id = l.id AND la.status = 'active'),
    (SELECT count(*)::int FROM public.label_members m2 WHERE m2.label_id = l.id)
  FROM public.label_members m
  JOIN public.labels l ON l.id = m.label_id
  WHERE m.user_id = auth.uid()
  ORDER BY l.created_at
$$;