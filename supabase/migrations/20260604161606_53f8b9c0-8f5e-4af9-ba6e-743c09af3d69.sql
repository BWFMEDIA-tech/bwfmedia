
-- Tighten streams: admin-only insert/update (delete already admin-only)
DROP POLICY IF EXISTS "Hosts can create streams" ON public.streams;
DROP POLICY IF EXISTS "Hosts update own stream" ON public.streams;

CREATE POLICY "Admins can create streams"
ON public.streams
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = host_id);

CREATE POLICY "Admins can update streams"
ON public.streams
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Audit log for blocked Stream Studio access attempts
CREATE TABLE IF NOT EXISTS public.stream_studio_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  reason text NOT NULL,
  route text,
  action text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stream_studio_access_log TO authenticated;
GRANT ALL ON public.stream_studio_access_log TO service_role;

ALTER TABLE public.stream_studio_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access log"
ON public.stream_studio_access_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
