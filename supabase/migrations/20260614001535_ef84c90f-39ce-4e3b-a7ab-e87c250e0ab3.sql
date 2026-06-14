
-- Shopify per-artist stores
CREATE TABLE public.shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain text NOT NULL UNIQUE,
  access_token text NOT NULL,
  scope text,
  shop_name text,
  shop_email text,
  currency text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopify_stores_user_idx ON public.shopify_stores(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_stores TO authenticated;
GRANT ALL ON public.shopify_stores TO service_role;
ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;
-- Owner can see/manage own store. access_token is NEVER selected by client code; server fns use service role.
CREATE POLICY "owner read store meta" ON public.shopify_stores FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner delete store" ON public.shopify_stores FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Merch products synced from Shopify
CREATE TABLE public.merch_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_product_id bigint NOT NULL,
  handle text,
  title text NOT NULL,
  description text,
  vendor text,
  product_type text,
  tags text[],
  status text,
  image_url text,
  min_price_cents integer,
  max_price_cents integer,
  currency text,
  total_inventory integer,
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, shopify_product_id)
);
CREATE INDEX merch_products_user_idx ON public.merch_products(user_id);
CREATE INDEX merch_products_featured_idx ON public.merch_products(is_featured) WHERE is_featured = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merch_products TO authenticated;
GRANT SELECT ON public.merch_products TO anon;
GRANT ALL ON public.merch_products TO service_role;
ALTER TABLE public.merch_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published products" ON public.merch_products FOR SELECT USING (is_published = true);
CREATE POLICY "owner manage products" ON public.merch_products FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Variants
CREATE TABLE public.merch_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.merch_products(id) ON DELETE CASCADE,
  shopify_variant_id bigint NOT NULL,
  title text,
  sku text,
  price_cents integer NOT NULL,
  compare_at_price_cents integer,
  inventory_quantity integer,
  available boolean NOT NULL DEFAULT true,
  option1 text,
  option2 text,
  option3 text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, shopify_variant_id)
);
CREATE INDEX merch_variants_product_idx ON public.merch_variants(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merch_variants TO authenticated;
GRANT SELECT ON public.merch_variants TO anon;
GRANT ALL ON public.merch_variants TO service_role;
ALTER TABLE public.merch_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read variants" ON public.merch_variants FOR SELECT USING (true);
CREATE POLICY "owner manage variants" ON public.merch_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merch_products p WHERE p.id = product_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.merch_products p WHERE p.id = product_id AND p.user_id = auth.uid()));

-- Commissions ledger
CREATE TABLE public.merch_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.shopify_stores(id) ON DELETE SET NULL,
  shopify_order_id bigint NOT NULL,
  order_number text,
  order_total_cents integer NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  commission_cents integer NOT NULL,
  artist_tier text NOT NULL DEFAULT 'basic',
  currency text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, shopify_order_id)
);
CREATE INDEX merch_commissions_user_idx ON public.merch_commissions(user_id);
GRANT SELECT ON public.merch_commissions TO authenticated;
GRANT ALL ON public.merch_commissions TO service_role;
ALTER TABLE public.merch_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read commissions" ON public.merch_commissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin read all commissions" ON public.merch_commissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_shopify_stores_updated BEFORE UPDATE ON public.shopify_stores FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_merch_products_updated BEFORE UPDATE ON public.merch_products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
