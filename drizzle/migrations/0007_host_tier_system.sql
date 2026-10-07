CREATE TABLE public.host_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  percentage numeric(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  rank integer NOT NULL DEFAULT 0,
  minimum_rooms integer NOT NULL DEFAULT 0,
  minimum_revenue_cents bigint NOT NULL DEFAULT 0,
  minimum_engagement integer NOT NULL DEFAULT 0,
  is_custom boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.host_tiers TO anon, authenticated;
GRANT ALL ON public.host_tiers TO service_role;
ALTER TABLE public.host_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers readable" ON public.host_tiers FOR SELECT USING (true);
CREATE POLICY "Admins manage tiers" ON public.host_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.host_tiers (slug,name,description,percentage,rank,minimum_rooms,minimum_revenue_cents,is_custom) VALUES
 ('standard','Standard Host','Default tier for approved hosts.',10,1,0,0,false),
 ('verified','Verified Host','Hosts meeting Tunevio verification and performance requirements.',12.5,2,5,0,false),
 ('featured','Featured Host','High-performing hosts, major events and consistently successful rooms.',15,3,20,50000,false),
 ('special','Special / Event Host','Custom percentage assigned by Tunevio for special events and partnerships.',15,4,0,0,true);

CREATE TABLE public.host_profiles (
  user_id uuid PRIMARY KEY,
  tier_id uuid NOT NULL REFERENCES public.host_tiers(id),
  custom_percentage numeric(5,2) CHECK (custom_percentage IS NULL OR (custom_percentage >= 0 AND custom_percentage <= 100)),
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.host_profiles TO authenticated;
GRANT ALL ON public.host_profiles TO service_role;
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own host profile" ON public.host_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.room_host_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL UNIQUE REFERENCES public.streams(id) ON DELETE RESTRICT,
  host_id uuid NOT NULL,
  tier_slug text NOT NULL,
  eligible_pool_cents bigint NOT NULL CHECK (eligible_pool_cents >= 0),
  host_percentage numeric(5,2) NOT NULL,
  host_amount_cents bigint NOT NULL CHECK (host_amount_cents >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','paid','frozen','reversed')),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  reversed_reason text
);
CREATE INDEX room_host_earnings_host_idx ON public.room_host_earnings(host_id, calculated_at DESC);
GRANT SELECT ON public.room_host_earnings TO authenticated;
GRANT ALL ON public.room_host_earnings TO service_role;
ALTER TABLE public.room_host_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own room earnings" ON public.room_host_earnings FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.host_tier_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  previous_tier text,
  new_tier text NOT NULL,
  previous_percentage numeric(5,2),
  new_percentage numeric(5,2) NOT NULL,
  changed_by uuid,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.host_tier_history TO authenticated;
GRANT ALL ON public.host_tier_history TO service_role;
ALTER TABLE public.host_tier_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own tier history" ON public.host_tier_history FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Effective rate for a host (default Standard)
CREATE OR REPLACE FUNCTION public.get_host_rate(_user_id uuid)
RETURNS TABLE(tier_slug text, tier_name text, percentage numeric, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.slug, t.name, COALESCE(hp.custom_percentage, t.percentage), COALESCE(hp.status,'active')
  FROM public.host_tiers t
  LEFT JOIN public.host_profiles hp ON hp.user_id = _user_id
  WHERE t.id = COALESCE(hp.tier_id, (SELECT id FROM public.host_tiers WHERE slug='standard'))
$$;

-- Eligible pool = paid room money (tips & gifts) on the stream
CREATE OR REPLACE FUNCTION public.room_eligible_pool_cents(_stream_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(GREATEST(amount_cents,0)),0)::bigint FROM public.tips
  WHERE stream_id = _stream_id AND status = 'paid'
$$;

-- Host-only live estimate
CREATE OR REPLACE FUNCTION public.get_room_host_estimate(_stream_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; r record; pool bigint; fin record;
BEGIN
  SELECT id, host_id, status INTO s FROM public.streams WHERE id = _stream_id;
  IF s.id IS NULL OR s.host_id <> auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO fin FROM public.room_host_earnings WHERE stream_id = _stream_id;
  IF fin.id IS NOT NULL THEN
    RETURN jsonb_build_object('final',true,'tier_slug',fin.tier_slug,'percentage',fin.host_percentage,
      'eligible_pool_cents',fin.eligible_pool_cents,'host_amount_cents',fin.host_amount_cents,'status',fin.status);
  END IF;
  SELECT * INTO r FROM public.get_host_rate(s.host_id);
  pool := public.room_eligible_pool_cents(_stream_id);
  RETURN jsonb_build_object('final',false,'tier_slug',r.tier_slug,'tier_name',r.tier_name,'percentage',r.percentage,
    'eligible_pool_cents',pool,'host_amount_cents',floor(pool * r.percentage / 100)::bigint,'status',r.status);
END $$;

-- Idempotent finalization; locks pool and rate
CREATE OR REPLACE FUNCTION public.finalize_room_earnings(_stream_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; r record; pool bigint; existing record;
BEGIN
  SELECT id, host_id, status INTO s FROM public.streams WHERE id = _stream_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Stream not found'; END IF;
  IF auth.uid() IS NOT NULL AND s.host_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Forbidden'; END IF;
  IF s.status = 'live' THEN RAISE EXCEPTION 'Room is still live'; END IF;
  SELECT * INTO existing FROM public.room_host_earnings WHERE stream_id = _stream_id;
  IF existing.id IS NOT NULL THEN RETURN to_jsonb(existing); END IF;
  SELECT * INTO r FROM public.get_host_rate(s.host_id);
  pool := public.room_eligible_pool_cents(_stream_id);
  INSERT INTO public.room_host_earnings(stream_id,host_id,tier_slug,eligible_pool_cents,host_percentage,host_amount_cents,status)
  VALUES (_stream_id, s.host_id, r.tier_slug, pool, r.percentage, floor(pool * r.percentage / 100)::bigint,
          CASE WHEN r.status='frozen' THEN 'frozen' ELSE 'pending' END)
  ON CONFLICT (stream_id) DO NOTHING
  RETURNING * INTO existing;
  IF existing.id IS NULL THEN SELECT * INTO existing FROM public.room_host_earnings WHERE stream_id = _stream_id; END IF;
  RETURN to_jsonb(existing);
END $$;

-- Auto-finalize when a stream ends
CREATE OR REPLACE FUNCTION public.streams_finalize_host_earnings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; pool bigint;
BEGIN
  IF NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    SELECT * INTO r FROM public.get_host_rate(NEW.host_id);
    pool := public.room_eligible_pool_cents(NEW.id);
    INSERT INTO public.room_host_earnings(stream_id,host_id,tier_slug,eligible_pool_cents,host_percentage,host_amount_cents,status)
    VALUES (NEW.id, NEW.host_id, r.tier_slug, pool, r.percentage, floor(pool * r.percentage / 100)::bigint,
            CASE WHEN r.status='frozen' THEN 'frozen' ELSE 'pending' END)
    ON CONFLICT (stream_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER streams_finalize_host_earnings AFTER UPDATE OF status ON public.streams
  FOR EACH ROW EXECUTE FUNCTION public.streams_finalize_host_earnings();

-- Admin: assign tier / custom percentage with audit
CREATE OR REPLACE FUNCTION public.assign_host_tier(_host_id uuid, _tier_slug text, _custom_percentage numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev record; t record; newpct numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Reason required'; END IF;
  SELECT * INTO t FROM public.host_tiers WHERE slug = _tier_slug AND active;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Unknown tier'; END IF;
  IF _custom_percentage IS NOT NULL AND (_custom_percentage < 0 OR _custom_percentage > 100) THEN
    RAISE EXCEPTION 'Percentage must be 0-100'; END IF;
  SELECT * INTO prev FROM public.get_host_rate(_host_id);
  newpct := COALESCE(_custom_percentage, t.percentage);
  INSERT INTO public.host_profiles(user_id,tier_id,custom_percentage,verified)
  VALUES (_host_id, t.id, _custom_percentage, t.rank >= 2)
  ON CONFLICT (user_id) DO UPDATE SET tier_id = EXCLUDED.tier_id, custom_percentage = EXCLUDED.custom_percentage,
    verified = EXCLUDED.verified, updated_at = now();
  INSERT INTO public.host_tier_history(host_id,previous_tier,new_tier,previous_percentage,new_percentage,changed_by,reason)
  VALUES (_host_id, prev.tier_slug, t.slug, prev.percentage, newpct, auth.uid(), _reason);
  RETURN jsonb_build_object('tier',t.slug,'percentage',newpct);
END $$;

-- Admin: freeze/unfreeze host and reverse earnings
CREATE OR REPLACE FUNCTION public.set_host_status(_host_id uuid, _status text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('active','frozen') THEN RAISE EXCEPTION 'Bad status'; END IF;
  INSERT INTO public.host_profiles(user_id,tier_id,status)
  VALUES (_host_id,(SELECT id FROM public.host_tiers WHERE slug='standard'),_status)
  ON CONFLICT (user_id) DO UPDATE SET status = _status, updated_at = now();
  UPDATE public.room_host_earnings SET status = CASE WHEN _status='frozen' THEN 'frozen' ELSE 'pending' END
  WHERE host_id = _host_id AND status IN (CASE WHEN _status='frozen' THEN 'pending' ELSE 'frozen' END);
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
  SELECT auth.uid(), 'host_status_'||_status, 'host', _host_id::text, jsonb_build_object('reason',_reason)
  WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_audit_log' AND column_name='actor_id');
END $$;

CREATE OR REPLACE FUNCTION public.reverse_host_earning(_earning_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Reason required'; END IF;
  UPDATE public.room_host_earnings SET status='reversed', reversed_reason=_reason
  WHERE id = _earning_id AND status <> 'paid';
END $$;

REVOKE EXECUTE ON FUNCTION public.room_eligible_pool_cents(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.streams_finalize_host_earnings() FROM anon, public, authenticated;