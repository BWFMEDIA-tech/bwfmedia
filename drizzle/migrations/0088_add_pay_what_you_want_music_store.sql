CREATE TABLE public.pwyw_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  product_type text NOT NULL CHECK (product_type IN ('single','ep','album','deluxe','exclusive')),
  artwork_url text,
  release_id uuid,
  pwyw_enabled boolean NOT NULL DEFAULT true,
  min_price_cents integer NOT NULL DEFAULT 100 CHECK (min_price_cents >= 100 AND min_price_cents <= 1000000),
  max_price_cents integer NOT NULL DEFAULT 1000000 CHECK (max_price_cents >= 100 AND max_price_cents <= 1000000 AND max_price_cents >= min_price_cents),
  suggested_prices_cents integer[] NOT NULL DEFAULT ARRAY[100,500,1000,2500,5000,10000],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pwyw_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pwyw_products TO authenticated;
GRANT ALL ON public.pwyw_products TO service_role;
ALTER TABLE public.pwyw_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY pwyw_products_public_read ON public.pwyw_products FOR SELECT TO anon, authenticated USING ((status = 'published' AND pwyw_enabled) OR auth.uid() = artist_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY pwyw_products_artist_insert ON public.pwyw_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_user_id AND public.has_entitlement(auth.uid(), 'pwyw_store'));
CREATE POLICY pwyw_products_artist_update ON public.pwyw_products FOR UPDATE TO authenticated USING (auth.uid() = artist_user_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK ((auth.uid() = artist_user_id AND public.has_entitlement(auth.uid(), 'pwyw_store')) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY pwyw_products_artist_delete ON public.pwyw_products FOR DELETE TO authenticated USING (auth.uid() = artist_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.pwyw_product_tracks (
  product_id uuid NOT NULL REFERENCES public.pwyw_products(id) ON DELETE CASCADE,
  track_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0 AND position <= 500),
  PRIMARY KEY (product_id, track_id),
  UNIQUE (product_id, position)
);
GRANT SELECT ON public.pwyw_product_tracks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pwyw_product_tracks TO authenticated;
GRANT ALL ON public.pwyw_product_tracks TO service_role;
ALTER TABLE public.pwyw_product_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY pwyw_product_tracks_public_read ON public.pwyw_product_tracks FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.pwyw_products p WHERE p.id = product_id AND ((p.status = 'published' AND p.pwyw_enabled) OR p.artist_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY pwyw_product_tracks_artist_insert ON public.pwyw_product_tracks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pwyw_products p WHERE p.id = product_id AND p.artist_user_id = auth.uid() AND public.has_entitlement(auth.uid(), 'pwyw_store')));
CREATE POLICY pwyw_product_tracks_artist_update ON public.pwyw_product_tracks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pwyw_products p WHERE p.id = product_id AND (p.artist_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.pwyw_products p WHERE p.id = product_id AND ((p.artist_user_id = auth.uid() AND public.has_entitlement(auth.uid(), 'pwyw_store')) OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY pwyw_product_tracks_artist_delete ON public.pwyw_product_tracks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.pwyw_products p WHERE p.id = product_id AND (p.artist_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.digital_music_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL,
  artist_user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.pwyw_products(id) ON DELETE RESTRICT,
  product_title text NOT NULL,
  product_type text NOT NULL,
  track_ids uuid[] NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 100 AND amount_cents <= 1000000),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  tax_cents integer NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_collected_cents integer CHECK (total_collected_cents IS NULL OR total_collected_cents >= amount_cents),
  fee_cents integer NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  artist_fee_cents integer NOT NULL DEFAULT 0 CHECK (artist_fee_cents >= 0),
  platform_fee_cents integer NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  artist_cents integer NOT NULL CHECK (artist_cents >= 0),
  platform_cents integer NOT NULL CHECK (platform_cents >= 0),
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','chargeback','failed','expired')),
  checkout_key text NOT NULL,
  checkout_url text,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  UNIQUE (buyer_user_id, checkout_key)
);
GRANT SELECT ON public.digital_music_purchases TO authenticated;
GRANT ALL ON public.digital_music_purchases TO service_role;
ALTER TABLE public.digital_music_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY digital_music_purchases_owner_read ON public.digital_music_purchases FOR SELECT TO authenticated USING (buyer_user_id = auth.uid() OR artist_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.digital_music_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.digital_music_purchases(id) ON DELETE RESTRICT,
  seller_user_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('sale','refund','chargeback')),
  amount_cents integer NOT NULL,
  fee_cents integer NOT NULL,
  artist_fee_cents integer NOT NULL,
  artist_cents integer NOT NULL,
  platform_cents integer NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_id, entry_type)
);
GRANT SELECT ON public.digital_music_earnings TO authenticated;
GRANT ALL ON public.digital_music_earnings TO service_role;
ALTER TABLE public.digital_music_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY digital_music_earnings_owner_read ON public.digital_music_earnings FOR SELECT TO authenticated USING (seller_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.has_entitlement(_user_id uuid, _perk text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND ((s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now())) OR (s.status = 'canceled' AND s.current_period_end > now()))
      AND (
        (_perk IN ('analytics_advanced','pwyw_store') AND coalesce(s.plan_type, s.price_id) IN ('artist_pro','artist_monthly','bwf_artist_membership_monthly','label_plan'))
        OR (_perk = 'label_panel' AND coalesce(s.plan_type, s.price_id) = 'label_plan')
        OR (_perk IN ('analytics_advanced','pwyw_store') AND s.price_id IN ('artist_pro','artist_monthly','bwf_artist_membership_monthly','label_plan'))
        OR (_perk = 'label_panel' AND s.price_id = 'label_plan')
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.pwyw_product_write_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE price integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.artist_user_id <> OLD.artist_user_id THEN RAISE EXCEPTION 'Product owner cannot change'; END IF;
  IF NOT public.has_entitlement(NEW.artist_user_id, 'pwyw_store') THEN RAISE EXCEPTION 'Artist Pro or Label Plan required'; END IF;
  IF NEW.status = 'published' AND (NEW.artwork_url IS NULL OR btrim(NEW.artwork_url) = '') THEN RAISE EXCEPTION 'Artwork is required before publishing'; END IF;
  IF NEW.suggested_prices_cents IS NULL OR cardinality(NEW.suggested_prices_cents) > 12 THEN RAISE EXCEPTION 'Invalid suggested prices'; END IF;
  FOREACH price IN ARRAY NEW.suggested_prices_cents LOOP
    IF price < NEW.min_price_cents OR price > NEW.max_price_cents THEN RAISE EXCEPTION 'Suggested prices must be within the allowed range'; END IF;
  END LOOP;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
CREATE TRIGGER pwyw_products_write_guard BEFORE INSERT OR UPDATE ON public.pwyw_products FOR EACH ROW EXECUTE FUNCTION public.pwyw_product_write_guard();

CREATE OR REPLACE FUNCTION public.pwyw_product_track_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.pwyw_products p JOIN public.play_tracks t ON t.id = NEW.track_id
    WHERE p.id = NEW.product_id AND p.artist_user_id = t.artist_user_id AND t.audio_url IS NOT NULL
  ) THEN RAISE EXCEPTION 'Select an existing song with audio from your own catalog'; END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER pwyw_product_tracks_write_guard BEFORE INSERT OR UPDATE ON public.pwyw_product_tracks FOR EACH ROW EXECUTE FUNCTION public.pwyw_product_track_guard();

CREATE OR REPLACE FUNCTION public.pwyw_mark_purchase_paid(_session_id text, _environment text, _payment_intent text, _total_collected integer, _tax integer, _fee integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE purchase public.digital_music_purchases%ROWTYPE;
BEGIN
  SELECT * INTO purchase FROM public.digital_music_purchases WHERE stripe_session_id = _session_id AND environment = _environment FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found'; END IF;
  IF _tax < 0 OR _fee < 0 OR _total_collected <> purchase.amount_cents + _tax THEN RAISE EXCEPTION 'Payment totals do not match'; END IF;
  IF purchase.status = 'pending' THEN
    UPDATE public.digital_music_purchases SET status = 'paid', stripe_payment_intent_id = _payment_intent, total_collected_cents = _total_collected, tax_cents = _tax, fee_cents = _fee, artist_fee_cents = floor(_fee * 0.60)::integer, platform_fee_cents = _fee - floor(_fee * 0.60)::integer, artist_cents = floor(amount_cents * 0.60)::integer, platform_cents = amount_cents - floor(amount_cents * 0.60)::integer, paid_at = now() WHERE id = purchase.id RETURNING * INTO purchase;
    INSERT INTO public.digital_music_earnings (purchase_id, seller_user_id, entry_type, amount_cents, fee_cents, artist_fee_cents, artist_cents, platform_cents, environment) VALUES (purchase.id, purchase.artist_user_id, 'sale', purchase.amount_cents, purchase.fee_cents, purchase.artist_fee_cents, purchase.artist_cents, purchase.platform_cents, purchase.environment) ON CONFLICT (purchase_id, entry_type) DO NOTHING;
  ELSIF purchase.status <> 'paid' THEN RAISE EXCEPTION 'Purchase cannot be marked paid'; END IF;
  RETURN purchase.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.pwyw_mark_purchase_paid(text,text,text,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pwyw_mark_purchase_paid(text,text,text,integer,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.pwyw_reverse_purchase(_payment_intent text, _environment text, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE purchase public.digital_music_purchases%ROWTYPE; sale public.digital_music_earnings%ROWTYPE;
BEGIN
  IF _reason NOT IN ('refund','chargeback') THEN RAISE EXCEPTION 'Invalid reversal'; END IF;
  SELECT * INTO purchase FROM public.digital_music_purchases WHERE stripe_payment_intent_id = _payment_intent AND environment = _environment FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF purchase.status <> 'paid' THEN RETURN purchase.id; END IF;
  SELECT * INTO sale FROM public.digital_music_earnings WHERE purchase_id = purchase.id AND entry_type = 'sale';
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale earnings missing'; END IF;
  UPDATE public.digital_music_purchases SET status = _reason, refunded_at = now() WHERE id = purchase.id;
  INSERT INTO public.digital_music_earnings (purchase_id, seller_user_id, entry_type, amount_cents, fee_cents, artist_fee_cents, artist_cents, platform_cents, environment) VALUES (purchase.id, purchase.artist_user_id, _reason, -sale.amount_cents, -sale.fee_cents, -sale.artist_fee_cents, -sale.artist_cents, -sale.platform_cents, sale.environment);
  RETURN purchase.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.pwyw_reverse_purchase(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pwyw_reverse_purchase(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.pwyw_purchased_track(_user_id uuid, _track_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.digital_music_purchases p WHERE p.buyer_user_id = _user_id AND p.status = 'paid' AND _track_id = ANY(p.track_ids));
$function$;
REVOKE ALL ON FUNCTION public.pwyw_purchased_track(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pwyw_purchased_track(uuid,uuid) TO authenticated, service_role;

CREATE INDEX pwyw_products_artist_idx ON public.pwyw_products(artist_user_id, created_at DESC);
CREATE INDEX pwyw_products_public_idx ON public.pwyw_products(status, pwyw_enabled, created_at DESC);
CREATE INDEX pwyw_product_tracks_track_idx ON public.pwyw_product_tracks(track_id);
CREATE INDEX digital_music_purchases_buyer_idx ON public.digital_music_purchases(buyer_user_id, created_at DESC);
CREATE INDEX digital_music_purchases_artist_idx ON public.digital_music_purchases(artist_user_id, created_at DESC);
CREATE INDEX digital_music_purchases_intent_idx ON public.digital_music_purchases(stripe_payment_intent_id);
