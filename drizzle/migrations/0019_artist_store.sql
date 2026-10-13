CREATE OR REPLACE FUNCTION public.store_can_manage(_artist uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (auth.uid() = _artist OR public.label_manages_artist(auth.uid(), _artist, ARRAY['owner','manager']) OR public.has_role(auth.uid(),'admin'))
$$;
GRANT EXECUTE ON FUNCTION public.store_can_manage(uuid) TO authenticated;

CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  release_id uuid REFERENCES public.distribution_releases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  product_type text NOT NULL DEFAULT 'vinyl',
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  inventory integer NOT NULL DEFAULT 0,
  shipping_info text,
  image_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_products_type_chk CHECK (product_type IN ('vinyl','cd','cassette','nfc_keychain','nfc_other','merch')),
  CONSTRAINT store_products_status_chk CHECK (status IN ('draft','published','archived')),
  CONSTRAINT store_products_price_chk CHECK (price_cents >= 0 AND price_cents <= 10000000),
  CONSTRAINT store_products_inv_chk CHECK (inventory >= 0 AND inventory <= 1000000),
  CONSTRAINT store_products_title_chk CHECK (char_length(title) BETWEEN 1 AND 200)
);
CREATE INDEX ON public.store_products(user_id);
CREATE INDEX ON public.store_products(status);
GRANT SELECT ON public.store_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published products are public" ON public.store_products FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Managers read products" ON public.store_products FOR SELECT TO authenticated USING (public.store_can_manage(user_id));
CREATE POLICY "Managers insert products" ON public.store_products FOR INSERT TO authenticated WITH CHECK (public.store_can_manage(user_id));
CREATE POLICY "Managers update products" ON public.store_products FOR UPDATE TO authenticated USING (public.store_can_manage(user_id)) WITH CHECK (public.store_can_manage(user_id));
CREATE POLICY "Managers delete products" ON public.store_products FOR DELETE TO authenticated USING (public.store_can_manage(user_id));

CREATE TABLE public.store_nfc_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.store_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE DEFAULT lower(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  destination_type text NOT NULL DEFAULT 'profile',
  destination_path text NOT NULL DEFAULT '/',
  programmed_confirmed_at timestamptz,
  last_scanned_at timestamptz,
  scan_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nfc_dest_type_chk CHECK (destination_type IN ('profile','release','page')),
  CONSTRAINT nfc_dest_path_chk CHECK (destination_path ~ '^/[A-Za-z0-9/_.?=&-]*$' AND char_length(destination_path) <= 300)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_nfc_links TO authenticated;
GRANT ALL ON public.store_nfc_links TO service_role;
ALTER TABLE public.store_nfc_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage nfc links" ON public.store_nfc_links FOR ALL TO authenticated
  USING (public.store_can_manage(user_id))
  WITH CHECK (public.store_can_manage(user_id) AND EXISTS (SELECT 1 FROM public.store_products p WHERE p.id = product_id AND p.user_id = store_nfc_links.user_id));

CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid,
  buyer_email text,
  seller_user_id uuid NOT NULL,
  product_id uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  product_title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  amount_total_cents integer,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
  tracking_number text,
  shipping_address jsonb,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_orders_status_chk CHECK (status IN ('pending','paid','failed','expired','refunded')),
  CONSTRAINT store_orders_ful_chk CHECK (fulfillment_status IN ('unfulfilled','processing','shipped','delivered','cancelled')),
  CONSTRAINT store_orders_qty_chk CHECK (quantity BETWEEN 1 AND 10)
);
CREATE INDEX ON public.store_orders(buyer_user_id);
CREATE INDEX ON public.store_orders(seller_user_id);
GRANT SELECT, UPDATE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see own orders" ON public.store_orders FOR SELECT TO authenticated USING (auth.uid() = buyer_user_id);
CREATE POLICY "Sellers see their sales" ON public.store_orders FOR SELECT TO authenticated USING (public.store_can_manage(seller_user_id));
CREATE POLICY "Sellers update fulfillment" ON public.store_orders FOR UPDATE TO authenticated USING (public.store_can_manage(seller_user_id)) WITH CHECK (public.store_can_manage(seller_user_id));

CREATE OR REPLACE FUNCTION public.store_orders_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.amount_total_cents IS DISTINCT FROM OLD.amount_total_cents
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
       OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
       OR NEW.unit_price_cents IS DISTINCT FROM OLD.unit_price_cents OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.seller_user_id IS DISTINCT FROM OLD.seller_user_id OR NEW.buyer_user_id IS DISTINCT FROM OLD.buyer_user_id
       OR NEW.environment IS DISTINCT FROM OLD.environment OR NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      RAISE EXCEPTION 'Only fulfillment details can be changed';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER store_orders_guard BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.store_orders_guard();

CREATE TABLE public.store_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  actor_user_id uuid,
  event text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_order_events TO authenticated;
GRANT ALL ON public.store_order_events TO service_role;
ALTER TABLE public.store_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order parties read events" ON public.store_order_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND (o.buyer_user_id = auth.uid() OR public.store_can_manage(o.seller_user_id))));

CREATE OR REPLACE FUNCTION public.store_mark_order_paid(_session_id text, _payment_intent text, _amount integer, _email text, _shipping jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.store_orders%ROWTYPE; left_inv integer;
BEGIN
  SELECT * INTO o FROM public.store_orders WHERE stripe_session_id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF o.status = 'paid' THEN RETURN 'already_paid'; END IF;
  UPDATE public.store_products SET inventory = GREATEST(inventory - o.quantity, 0), updated_at = now()
    WHERE id = o.product_id RETURNING inventory INTO left_inv;
  UPDATE public.store_orders SET status='paid', paid_at=now(), stripe_payment_intent_id=_payment_intent,
    amount_total_cents=_amount, buyer_email=COALESCE(_email,buyer_email), shipping_address=COALESCE(_shipping,shipping_address)
    WHERE id = o.id;
  INSERT INTO public.store_order_events(order_id, event, details) VALUES (o.id,'paid', jsonb_build_object('amount',_amount,'inventory_left',left_inv));
  RETURN 'paid';
END $$;
REVOKE ALL ON FUNCTION public.store_mark_order_paid(text,text,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_mark_order_paid(text,text,integer,text,jsonb) TO service_role;

CREATE POLICY "Store images public read" ON storage.objects FOR SELECT USING (bucket_id = 'store-products');
CREATE POLICY "Store images owner upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-products' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Store images owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-products' AND (storage.foldername(name))[1] = auth.uid()::text);
