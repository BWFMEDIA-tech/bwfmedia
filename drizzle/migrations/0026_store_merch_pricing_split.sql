ALTER TABLE public.store_products DROP CONSTRAINT store_products_type_chk;
ALTER TABLE public.store_products ADD CONSTRAINT store_products_type_chk CHECK (product_type IN ('vinyl','cd','cassette','nfc_keychain','nfc_card','nfc_other','tshirt','hoodie','merch'));
ALTER TABLE public.store_products
  ADD COLUMN review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','pending','approved','disabled')),
  ADD COLUMN cost_cents integer CHECK (cost_cents IS NULL OR cost_cents BETWEEN 0 AND 10000000),
  ADD COLUMN min_quantity integer NOT NULL DEFAULT 1 CHECK (min_quantity BETWEEN 1 AND 10),
  ADD COLUMN made_to_order boolean NOT NULL DEFAULT false,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz;

CREATE TABLE public.store_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 0 AND 10000000),
  cost_cents integer CHECK (cost_cents IS NULL OR cost_cents BETWEEN 0 AND 10000000),
  inventory integer NOT NULL DEFAULT 0 CHECK (inventory BETWEEN 0 AND 1000000),
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.store_product_variants(product_id);
GRANT SELECT ON public.store_product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_product_variants TO authenticated;
GRANT ALL ON public.store_product_variants TO service_role;
ALTER TABLE public.store_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variants of live products are public" ON public.store_product_variants FOR SELECT TO anon, authenticated
  USING (active AND EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = product_id AND p.status='published' AND p.review_status='approved'));
CREATE POLICY "Managers or admins manage variants" ON public.store_product_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = product_id AND public.store_can_manage(p.user_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = product_id AND public.store_can_manage(p.user_id)));

CREATE TABLE public.store_shipping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('nfc','cds_cassettes','apparel','vinyl')),
  region text NOT NULL CHECK (region IN ('domestic','international')),
  first_item_cents integer NOT NULL CHECK (first_item_cents BETWEEN 0 AND 100000),
  additional_item_cents integer NOT NULL DEFAULT 0 CHECK (additional_item_cents BETWEEN 0 AND 100000),
  active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, region)
);
GRANT SELECT ON public.store_shipping_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_shipping_rules TO authenticated;
GRANT ALL ON public.store_shipping_rules TO service_role;
ALTER TABLE public.store_shipping_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active shipping rules are public" ON public.store_shipping_rules FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Admins manage shipping" ON public.store_shipping_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.store_revenue_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  artist_bps integer NOT NULL DEFAULT 6000 CHECK (artist_bps BETWEEN 0 AND 10000),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_revenue_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.store_revenue_settings TO authenticated;
GRANT ALL ON public.store_revenue_settings TO service_role;
ALTER TABLE public.store_revenue_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Split is public" ON public.store_revenue_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins set split" ON public.store_revenue_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.store_earnings_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE RESTRICT,
  seller_user_id uuid NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('sale','reversal')),
  reason text,
  revenue_cents integer NOT NULL,
  cost_cents integer NOT NULL,
  fee_cents integer NOT NULL,
  artist_bps integer NOT NULL,
  artist_cents integer NOT NULL,
  platform_cents integer NOT NULL,
  environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, entry_type)
);
CREATE INDEX ON public.store_earnings_ledger(seller_user_id);
GRANT SELECT ON public.store_earnings_ledger TO authenticated;
GRANT ALL ON public.store_earnings_ledger TO service_role;
ALTER TABLE public.store_earnings_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers read own earnings" ON public.store_earnings_ledger FOR SELECT TO authenticated
  USING (public.store_can_manage(seller_user_id) OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.store_orders
  ADD COLUMN variant_id uuid REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  ADD COLUMN variant_label text,
  ADD COLUMN unit_cost_cents integer,
  ADD COLUMN shipping_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN shipping_region text,
  ADD COLUMN fee_cents integer,
  ADD COLUMN carrier text,
  ADD COLUMN shipped_at timestamptz,
  ADD COLUMN delivered_at timestamptz;

-- Public listings: only reviewed products.
DROP POLICY "Published products are public" ON public.store_products;
CREATE POLICY "Published products are public" ON public.store_products FOR SELECT TO anon, authenticated USING (status = 'published' AND review_status = 'approved');
CREATE POLICY "Admins manage all products" ON public.store_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Artists can't approve, set costs, or change a reviewed price without re-review.
CREATE OR REPLACE FUNCTION public.store_products_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.cost_cents := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
    IF NEW.review_status NOT IN ('draft','pending') THEN NEW.review_status := 'draft'; END IF;
    RETURN NEW;
  END IF;
  NEW.cost_cents := OLD.cost_cents; NEW.reviewed_by := OLD.reviewed_by; NEW.reviewed_at := OLD.reviewed_at;
  IF OLD.review_status = 'disabled' THEN NEW.review_status := 'disabled';
  ELSIF NEW.review_status IS DISTINCT FROM OLD.review_status AND NOT (NEW.review_status IN ('draft','pending') AND OLD.review_status IN ('draft','pending')) THEN
    NEW.review_status := OLD.review_status;
  END IF;
  IF OLD.review_status = 'approved' AND (NEW.price_cents <> OLD.price_cents OR NEW.product_type <> OLD.product_type OR NEW.min_quantity <> OLD.min_quantity OR NEW.made_to_order <> OLD.made_to_order) THEN
    NEW.review_status := 'pending';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER store_products_guard BEFORE INSERT OR UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.store_products_guard();

CREATE OR REPLACE FUNCTION public.store_variants_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.cost_cents := NULL; ELSE NEW.cost_cents := OLD.cost_cents; END IF;
  IF TG_OP = 'INSERT' OR NEW.price_cents <> OLD.price_cents THEN
    UPDATE public.store_products SET review_status = 'pending' WHERE id = NEW.product_id AND review_status = 'approved';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER store_variants_guard BEFORE INSERT OR UPDATE ON public.store_product_variants FOR EACH ROW EXECUTE FUNCTION public.store_variants_guard();

-- Paid: decrement variant or product stock unless made to order.
CREATE OR REPLACE FUNCTION public.store_mark_order_paid(_session_id text, _payment_intent text, _amount integer, _email text, _shipping jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.store_orders%ROWTYPE; mto boolean; left_inv integer; oversold boolean := false;
BEGIN
  SELECT * INTO o FROM public.store_orders WHERE stripe_session_id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF o.status = 'paid' OR o.status = 'refunded' THEN RETURN 'already_paid'; END IF;
  SELECT made_to_order INTO mto FROM public.store_products WHERE id = o.product_id;
  IF NOT COALESCE(mto,false) THEN
    IF o.variant_id IS NOT NULL THEN
      UPDATE public.store_product_variants SET inventory = GREATEST(inventory - o.quantity, 0), updated_at = now()
        WHERE id = o.variant_id RETURNING inventory INTO left_inv;
      SELECT (inventory < o.quantity) INTO oversold FROM public.store_product_variants WHERE id = o.variant_id;
    ELSE
      SELECT (inventory < o.quantity) INTO oversold FROM public.store_products WHERE id = o.product_id;
      UPDATE public.store_products SET inventory = GREATEST(inventory - o.quantity, 0), updated_at = now()
        WHERE id = o.product_id RETURNING inventory INTO left_inv;
    END IF;
  END IF;
  UPDATE public.store_orders SET status='paid', paid_at=now(), stripe_payment_intent_id=_payment_intent,
    amount_total_cents=_amount, buyer_email=COALESCE(_email,buyer_email), shipping_address=COALESCE(_shipping,shipping_address)
    WHERE id = o.id;
  INSERT INTO public.store_order_events(order_id, event, details) VALUES (o.id,'paid', jsonb_build_object('amount',_amount,'inventory_left',left_inv,'made_to_order',COALESCE(mto,false)));
  RETURN 'paid';
END $$;
REVOKE ALL ON FUNCTION public.store_mark_order_paid(text,text,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_mark_order_paid(text,text,integer,text,jsonb) TO service_role;