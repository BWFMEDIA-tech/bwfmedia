ALTER TABLE public.host_tiers ADD COLUMN IF NOT EXISTS referral_percentage numeric(5,2) NOT NULL DEFAULT 0;

CREATE TABLE public.host_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'link' CHECK (source IN ('link','live_room')),
  stream_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (host_id <> referred_user_id)
);
CREATE INDEX ON public.host_referrals(host_id);
GRANT SELECT ON public.host_referrals TO authenticated;
GRANT ALL ON public.host_referrals TO service_role;
ALTER TABLE public.host_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts see own referrals" ON public.host_referrals FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.host_referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  invoice_id text NOT NULL UNIQUE,
  subscription_amount_cents bigint NOT NULL,
  percentage numeric(5,2) NOT NULL,
  commission_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','paid','reversed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.host_referral_commissions(host_id);
GRANT SELECT ON public.host_referral_commissions TO authenticated;
GRANT ALL ON public.host_referral_commissions TO service_role;
ALTER TABLE public.host_referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts see own commissions" ON public.host_referral_commissions FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Capture referral from signup metadata
CREATE OR REPLACE FUNCTION public.capture_host_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid; _stream uuid; _src text;
BEGIN
  BEGIN
    _host := NULLIF(NEW.raw_user_meta_data->>'referred_by','')::uuid;
    _stream := NULLIF(NEW.raw_user_meta_data->>'referral_stream_id','')::uuid;
    _src := CASE WHEN NEW.raw_user_meta_data->>'referral_source' = 'live_room' THEN 'live_room' ELSE 'link' END;
    IF _host IS NOT NULL AND _host <> NEW.id AND EXISTS (SELECT 1 FROM auth.users WHERE id = _host) THEN
      INSERT INTO public.host_referrals(host_id, referred_user_id, source, stream_id)
      VALUES (_host, NEW.id, _src, _stream) ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN NULL;
  END;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_capture_referral AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.capture_host_referral();

-- Credit commission on a paid subscription invoice (service role only)
CREATE OR REPLACE FUNCTION public.record_host_referral_commission(_referred_user_id uuid, _invoice_id text, _amount_cents bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _host uuid; _pct numeric; _status text; _c bigint;
BEGIN
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