ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_avatar_url text;

COMMENT ON COLUMN public.profiles.brand_name IS
  'Optional network/brand/organization display name. When set, takes priority over display_name in all live/stage/chat surfaces.';
COMMENT ON COLUMN public.profiles.brand_avatar_url IS
  'Optional brand logo URL. When set, takes priority over avatar_url in all live/stage/chat surfaces.';