CREATE TABLE public.artist_referral_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  percentage numeric(5,2) NOT NULL DEFAULT 10 CHECK (percentage >= 0 AND percentage <= 100),
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.artist_referral_settings(id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.artist_referral_settings TO anon, authenticated;
GRANT ALL ON public.artist_referral_settings TO service_role;
ALTER TABLE public.artist_referral_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads referral settings" ON public.artist_referral_settings FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.host_referral_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.host_referral_codes TO authenticated;
GRANT ALL ON public.host_referral_codes TO service_role;
ALTER TABLE public.host_referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Host or admin reads code" ON public.host_referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.artist_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  artist_id uuid NOT NULL UNIQUE,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (host_id <> artist_id)
);
CREATE INDEX ON public.artist_referrals(host_id);
GRANT SELECT ON public.artist_referrals TO authenticated;
GRANT ALL ON public.artist_referrals TO service_role;
ALTER TABLE public.artist_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Host or admin reads artist referrals" ON public.artist_referrals FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.artist_referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  invoice_id text NOT NULL UNIQUE,
  subscription_amount_cents bigint NOT NULL,
  percentage numeric(5,2) NOT NULL,
  commission_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','paid','reversed')),
  reversed_by uuid,
  reversed_reason text,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.artist_referral_commissions(host_id, created_at);
GRANT SELECT ON public.artist_referral_commissions TO authenticated;
GRANT ALL ON public.artist_referral_commissions TO service_role;
ALTER TABLE public.artist_referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Host or admin reads artist commissions" ON public.artist_referral_commissions FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.artist_referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.artist_referral_clicks(host_id);
GRANT SELECT ON public.artist_referral_clicks TO authenticated;
GRANT ALL ON public.artist_referral_clicks TO service_role;
ALTER TABLE public.artist_referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Host or admin reads clicks" ON public.artist_referral_clicks FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Generate a unique referral code for a host
CREATE OR REPLACE FUNCTION public.ensure_host_referral_code(_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _base text; _code text; _n int := 0;
BEGIN
  SELECT code INTO _code FROM host_referral_codes WHERE user_id = _user_id;
  IF _code IS NOT NULL THEN RETURN _code; END IF;
  SELECT lower(regexp_replace(COALESCE(NULLIF(username,''), NULLIF(display_name,''), 'host'), '[^a-zA-Z0-9_]+', '', 'g'))
    INTO _base FROM profiles WHERE id = _user_id;
  _base := COALESCE(NULLIF(_base,''), 'host');
  _code := _base;
  WHILE EXISTS (SELECT 1 FROM host_referral_codes WHERE code = _code) LOOP
    _n := _n + 1; _code := _base || _n::text;
  END LOOP;
  INSERT INTO host_referral_codes(user_id, code) VALUES (_user_id, _code) ON CONFLICT (user_id) DO NOTHING;
  RETURN (SELECT code FROM host_referral_codes WHERE user_id = _user_id);
END $$;
REVOKE ALL ON FUNCTION public.ensure_host_referral_code(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_host_referral_code(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.user_roles_host_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'host' THEN
    BEGIN PERFORM public.ensure_host_referral_code(NEW.user_id); EXCEPTION WHEN others THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_user_role_host_code AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.user_roles_host_code();

SELECT public.ensure_host_referral_code(user_id) FROM public.user_roles WHERE role = 'host';

-- First qualifying artist signup attribution (permanent)
CREATE OR REPLACE FUNCTION public.capture_artist_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid;
BEGIN
  BEGIN
    IF NEW.raw_user_meta_data->>'role' = 'artist'
       AND NEW.raw_user_meta_data->>'referral_source' = 'link'
       AND (SELECT enabled FROM artist_referral_settings WHERE id) THEN
      _host := NULLIF(NEW.raw_user_meta_data->>'referred_by','')::uuid;
      IF _host IS NOT NULL AND _host <> NEW.id AND public.has_role(_host, 'host') THEN
        INSERT INTO artist_referrals(host_id, artist_id, code)
        VALUES (_host, NEW.id, (SELECT code FROM host_referral_codes WHERE user_id = _host))
        ON CONFLICT (artist_id) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN others THEN NULL;
  END;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_capture_artist_referral AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.capture_artist_referral();

-- Commission on an artist membership invoice (service role only)
CREATE OR REPLACE FUNCTION public.record_artist_referral_commission(_artist_id uuid, _invoice_id text, _amount_cents bigint, _plan_role text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid; _pct numeric; _on boolean; _c bigint; _frozen boolean;
BEGIN
  IF _plan_role IS DISTINCT FROM 'artist' OR _amount_cents <= 0 THEN RETURN 0; END IF;
  SELECT percentage, enabled INTO _pct, _on FROM artist_referral_settings WHERE id;
  IF NOT COALESCE(_on,false) OR COALESCE(_pct,0) <= 0 THEN RETURN 0; END IF;
  SELECT host_id INTO _host FROM artist_referrals WHERE artist_id = _artist_id;
  IF _host IS NULL OR _host = _artist_id THEN RETURN 0; END IF;
  SELECT status = 'frozen' INTO _frozen FROM host_profiles WHERE user_id = _host;
  IF COALESCE(_frozen,false) THEN RETURN 0; END IF;
  _c := floor(_amount_cents * _pct / 100);
  INSERT INTO artist_referral_commissions(host_id, artist_id, invoice_id, subscription_amount_cents, percentage, commission_cents)
  VALUES (_host, _artist_id, _invoice_id, _amount_cents, _pct, _c) ON CONFLICT (invoice_id) DO NOTHING;
  RETURN _c;
END $$;
REVOKE ALL ON FUNCTION public.record_artist_referral_commission(uuid,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_artist_referral_commission(uuid,text,bigint,text) TO service_role;

-- Never pay the general signup reward on an invoice already paid as an artist referral
CREATE OR REPLACE FUNCTION public.record_host_referral_commission(_referred_user_id uuid, _invoice_id text, _amount_cents bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid; _pct numeric; _status text; _c bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM artist_referral_commissions WHERE invoice_id = _invoice_id) THEN RETURN 0; END IF;
  SELECT host_id INTO _host FROM host_referrals WHERE referred_user_id = _referred_user_id;
  IF _host IS NULL OR _amount_cents <= 0 THEN RETURN 0; END IF;
  SELECT t.referral_percentage, COALESCE(hp.status,'active') INTO _pct, _status
    FROM host_profiles hp JOIN host_tiers t ON t.id = hp.tier_id WHERE hp.user_id = _host;
  IF COALESCE(_pct,0) <= 0 OR _status = 'frozen' THEN RETURN 0; END IF;
  _c := floor(_amount_cents * _pct / 100);
  INSERT INTO host_referral_commissions(host_id, referred_user_id, invoice_id, subscription_amount_cents, percentage, commission_cents)
  VALUES (_host, _referred_user_id, _invoice_id, _amount_cents, _pct, _c) ON CONFLICT (invoice_id) DO NOTHING;
  RETURN _c;
END $$;
REVOKE ALL ON FUNCTION public.record_host_referral_commission(uuid,text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_host_referral_commission(uuid,text,bigint) TO service_role;