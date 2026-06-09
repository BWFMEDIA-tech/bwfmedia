
-- raise_hand_requests: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Hand requests viewable by everyone" ON public.raise_hand_requests;
CREATE POLICY "Hand requests viewable by authenticated"
  ON public.raise_hand_requests FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.raise_hand_requests FROM anon;

-- stage_participants: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Stage participants viewable by everyone" ON public.stage_participants;
CREATE POLICY "Stage participants viewable by authenticated"
  ON public.stage_participants FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.stage_participants FROM anon;

-- stream_queue: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Queue viewable by everyone" ON public.stream_queue;
CREATE POLICY "Queue viewable by authenticated"
  ON public.stream_queue FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.stream_queue FROM anon;

-- stream_recordings: drop public anon access; restrict to host or admin
DROP POLICY IF EXISTS "Recordings viewable by everyone" ON public.stream_recordings;
CREATE POLICY "Host or admin can view recordings"
  ON public.stream_recordings FOR SELECT
  TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.stream_recordings FROM anon;

-- tips: drop host row access (hosts use aggregate RPC); keep admin + tipper-self
DROP POLICY IF EXISTS "Admins and hosts see all tips" ON public.tips;
CREATE POLICY "Admins can see all tips"
  ON public.tips FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
