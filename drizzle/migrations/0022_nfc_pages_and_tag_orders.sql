CREATE TABLE public.nfc_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,10),
  status text NOT NULL DEFAULT 'draft',
  tabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nfc_pages TO authenticated;
GRANT SELECT ON public.nfc_pages TO anon;
GRANT ALL ON public.nfc_pages TO service_role;
ALTER TABLE public.nfc_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage nfc pages" ON public.nfc_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Published nfc pages are public" ON public.nfc_pages FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE INDEX nfc_pages_user_idx ON public.nfc_pages(user_id);

CREATE TABLE public.nfc_tag_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag_type text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  min_quantity integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nfc_tag_products TO anon, authenticated;
GRANT ALL ON public.nfc_tag_products TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.nfc_tag_products TO authenticated;
ALTER TABLE public.nfc_tag_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active tag products readable" ON public.nfc_tag_products FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage tag products" ON public.nfc_tag_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.nfc_tag_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL,
  tag_product_id uuid REFERENCES public.nfc_tag_products(id) ON DELETE SET NULL,
  page_id uuid REFERENCES public.nfc_pages(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
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
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.nfc_tag_orders TO authenticated;
GRANT ALL ON public.nfc_tag_orders TO service_role;
ALTER TABLE public.nfc_tag_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own tag orders" ON public.nfc_tag_orders FOR SELECT TO authenticated USING (auth.uid() = buyer_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update tag orders" ON public.nfc_tag_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.nfc_tag_orders_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.amount_total_cents IS DISTINCT FROM OLD.amount_total_cents
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
       OR NEW.buyer_user_id IS DISTINCT FROM OLD.buyer_user_id OR NEW.unit_price_cents IS DISTINCT FROM OLD.unit_price_cents THEN
      RAISE EXCEPTION 'Only fulfillment fields can be changed';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER nfc_tag_orders_guard BEFORE UPDATE ON public.nfc_tag_orders FOR EACH ROW EXECUTE FUNCTION public.nfc_tag_orders_guard();