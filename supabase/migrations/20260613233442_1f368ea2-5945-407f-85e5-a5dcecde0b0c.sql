
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS genres text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS member_since date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS featured_track_id uuid,
  ADD COLUMN IF NOT EXISTS featured_video_id uuid;

CREATE TABLE IF NOT EXISTS public.user_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  handle text,
  url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_social_links TO authenticated;
GRANT SELECT ON public.user_social_links TO anon;
GRANT ALL ON public.user_social_links TO service_role;
ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public sees enabled links" ON public.user_social_links
  FOR SELECT USING (enabled = true);
CREATE POLICY "Owner reads all own links" ON public.user_social_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts own links" ON public.user_social_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own links" ON public.user_social_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes own links" ON public.user_social_links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_social_links_updated
  BEFORE UPDATE ON public.user_social_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  accent_color text NOT NULL DEFAULT '#E50914',
  language text NOT NULL DEFAULT 'en',
  autoplay boolean NOT NULL DEFAULT true,
  crossfade_seconds int NOT NULL DEFAULT 0,
  audio_quality text NOT NULL DEFAULT 'high',
  email_marketing boolean NOT NULL DEFAULT false,
  email_product boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own settings" ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts own settings" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own settings" ON public.user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_settings_updated
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.connected_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_label text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_apps TO authenticated;
GRANT ALL ON public.connected_apps TO service_role;
ALTER TABLE public.connected_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages connected apps" ON public.connected_apps
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can update own presence" ON public.stage_participants;
CREATE POLICY "User can update own presence" ON public.stage_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND stage_role IN ('listener','green_room'));
