-- 1) Create server-only credentials table
CREATE TABLE IF NOT EXISTS public.shopify_store_credentials (
  store_id uuid PRIMARY KEY REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Only service_role can access. Explicitly revoke from anon/authenticated.
REVOKE ALL ON public.shopify_store_credentials FROM PUBLIC;
REVOKE ALL ON public.shopify_store_credentials FROM anon;
REVOKE ALL ON public.shopify_store_credentials FROM authenticated;
GRANT ALL ON public.shopify_store_credentials TO service_role;

-- 3) Enable RLS with no policies -> denies all non-service-role access
ALTER TABLE public.shopify_store_credentials ENABLE ROW LEVEL SECURITY;

-- 4) Migrate existing tokens (if any)
INSERT INTO public.shopify_store_credentials (store_id, access_token)
SELECT id, access_token FROM public.shopify_stores
WHERE access_token IS NOT NULL
ON CONFLICT (store_id) DO UPDATE SET access_token = EXCLUDED.access_token, updated_at = now();

-- 5) Drop access_token from shopify_stores so it can never be selected by clients
ALTER TABLE public.shopify_stores DROP COLUMN IF EXISTS access_token;

-- 6) Keep updated_at fresh
DROP TRIGGER IF EXISTS trg_shopify_store_credentials_updated ON public.shopify_store_credentials;
CREATE TRIGGER trg_shopify_store_credentials_updated
BEFORE UPDATE ON public.shopify_store_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();