
-- 1. Connection metadata (safe for client reads)
CREATE TABLE public.stream_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('twitch','youtube','facebook','kick')),
  account_label text,
  external_account_id text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);
GRANT SELECT, DELETE ON public.stream_platform_connections TO authenticated;
GRANT ALL ON public.stream_platform_connections TO service_role;
ALTER TABLE public.stream_platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY spc_owner_select ON public.stream_platform_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY spc_owner_delete ON public.stream_platform_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Credentials (server-only)
CREATE TABLE public.stream_platform_credentials (
  connection_id uuid PRIMARY KEY REFERENCES public.stream_platform_connections(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  rtmp_url text,
  rtmp_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.stream_platform_credentials FROM PUBLIC;
REVOKE ALL ON public.stream_platform_credentials FROM anon;
REVOKE ALL ON public.stream_platform_credentials FROM authenticated;
GRANT ALL ON public.stream_platform_credentials TO service_role;
ALTER TABLE public.stream_platform_credentials ENABLE ROW LEVEL SECURITY;
-- No policies => no client access even if grants leak.

-- 3. Per-stream destination selection & status
CREATE TABLE public.stream_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','live','failed','disconnected','ended')),
  error_message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_destinations TO authenticated;
GRANT ALL ON public.stream_destinations TO service_role;
ALTER TABLE public.stream_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_owner_all ON public.stream_destinations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
