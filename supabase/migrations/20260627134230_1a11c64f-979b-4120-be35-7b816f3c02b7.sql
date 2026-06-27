
-- 1) USER PRESENCE: owner-only, separated from public profiles
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presence_owner_select" ON public.user_presence
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "presence_owner_insert" ON public.user_presence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presence_owner_update" ON public.user_presence
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Backfill from profiles
INSERT INTO public.user_presence (user_id, last_seen_at, updated_at)
SELECT id, COALESCE(last_seen_at, now()), now()
FROM public.profiles
WHERE id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2) USER ACCOUNTS: private hub for owner-only account data
CREATE TABLE IF NOT EXISTS public.user_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  subscription_plan text,
  subscription_status text,
  stripe_customer_id text,
  stripe_connect_account_id text,
  notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_accounts TO authenticated;
GRANT ALL ON public.user_accounts TO service_role;

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_owner_select" ON public.user_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "account_owner_insert" ON public.user_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "account_owner_update" ON public.user_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_accounts_touch_updated_at
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER user_presence_touch_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) REMOVE PRESENCE LEAK FROM PUBLIC PROFILES
-- Drop the helper that read last_seen_at from profiles
DROP FUNCTION IF EXISTS public.get_my_profile_last_seen_at();

-- Recreate it against user_presence so any existing callers keep working
CREATE OR REPLACE FUNCTION public.get_my_last_seen_at()
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT last_seen_at FROM public.user_presence WHERE user_id = auth.uid() $$;

-- Remove last_seen_at column from profiles (presence no longer leaks)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_seen_at;
