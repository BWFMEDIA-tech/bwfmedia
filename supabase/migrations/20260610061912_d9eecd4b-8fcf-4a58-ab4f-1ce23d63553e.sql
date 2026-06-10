
-- Add co_host stage role
ALTER TABLE public.stage_participants DROP CONSTRAINT IF EXISTS stage_participants_stage_role_check;
ALTER TABLE public.stage_participants ADD CONSTRAINT stage_participants_stage_role_check
  CHECK (stage_role = ANY (ARRAY['host','co_host','speaker','listener','green_room']::text[]));

-- Streams: host transfer mode setting
ALTER TABLE public.streams
  ADD COLUMN IF NOT EXISTS host_transfer_mode text NOT NULL DEFAULT 'co_host'
    CHECK (host_transfer_mode IN ('co_host','transfer'));

-- Helper: is the given user a host or co_host on a given stream (security definer)
CREATE OR REPLACE FUNCTION public.is_stream_host(_user_id uuid, _stream_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.streams s WHERE s.id = _stream_id AND s.host_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.stage_participants sp
    WHERE sp.stream_id = _stream_id AND sp.user_id = _user_id
      AND sp.stage_role IN ('host','co_host')
  );
$$;

-- Update stage_participants policies to grant co_hosts the same manage rights
DROP POLICY IF EXISTS "Host or admin can add stage participants" ON public.stage_participants;
CREATE POLICY "Host or admin can add stage participants"
  ON public.stage_participants FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'moderator'::app_role)
    OR public.is_stream_host(auth.uid(), stream_id)
  );

DROP POLICY IF EXISTS "Host or admin can update stage participants" ON public.stage_participants;
CREATE POLICY "Host or admin can update stage participants"
  ON public.stage_participants FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'moderator'::app_role)
    OR public.is_stream_host(auth.uid(), stream_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'moderator'::app_role)
    OR public.is_stream_host(auth.uid(), stream_id)
  );

DROP POLICY IF EXISTS "User can leave or host/admin can remove" ON public.stage_participants;
CREATE POLICY "User can leave or host/admin can remove"
  ON public.stage_participants FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'moderator'::app_role)
    OR public.is_stream_host(auth.uid(), stream_id)
  );
