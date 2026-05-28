
-- ============ streams table extensions ============
ALTER TABLE public.streams
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'broadcast' CHECK (mode IN ('broadcast','stage')),
  ADD COLUMN IF NOT EXISTS stage_locked boolean NOT NULL DEFAULT false;

-- ============ stage_participants ============
CREATE TABLE IF NOT EXISTS public.stage_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stage_role text NOT NULL DEFAULT 'listener' CHECK (stage_role IN ('host','speaker','listener','green_room')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_participants TO authenticated;
GRANT SELECT ON public.stage_participants TO anon;
GRANT ALL ON public.stage_participants TO service_role;
ALTER TABLE public.stage_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stage participants viewable by everyone"
  ON public.stage_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join stage as listener"
  ON public.stage_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND stage_role IN ('listener','green_room'));

CREATE POLICY "Host or admin can update stage participants"
  ON public.stage_participants FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stage_participants.stream_id AND s.host_id = auth.uid())
  );

CREATE POLICY "User can leave or host/admin can remove"
  ON public.stage_participants FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stage_participants.stream_id AND s.host_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_stage_participants_stream ON public.stage_participants(stream_id);

-- ============ raise_hand_requests ============
CREATE TABLE IF NOT EXISTS public.raise_hand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raise_hand_requests TO authenticated;
GRANT SELECT ON public.raise_hand_requests TO anon;
GRANT ALL ON public.raise_hand_requests TO service_role;
ALTER TABLE public.raise_hand_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hand requests viewable by everyone"
  ON public.raise_hand_requests FOR SELECT USING (true);

CREATE POLICY "User raises own hand"
  ON public.raise_hand_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User cancels or host updates"
  ON public.raise_hand_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = raise_hand_requests.stream_id AND s.host_id = auth.uid())
  );

CREATE POLICY "User or host can delete request"
  ON public.raise_hand_requests FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = raise_hand_requests.stream_id AND s.host_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_raise_hand_stream ON public.raise_hand_requests(stream_id, status);

-- ============ stream_queue ============
CREATE TABLE IF NOT EXISTS public.stream_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  genre text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','on_stage','done','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_queue TO authenticated;
GRANT SELECT ON public.stream_queue TO anon;
GRANT ALL ON public.stream_queue TO service_role;
ALTER TABLE public.stream_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Queue viewable by everyone"
  ON public.stream_queue FOR SELECT USING (true);

CREATE POLICY "Authenticated can join queue"
  ON public.stream_queue FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host or self can update queue"
  ON public.stream_queue FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_queue.stream_id AND s.host_id = auth.uid())
  );

CREATE POLICY "Host or self can delete queue"
  ON public.stream_queue FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_queue.stream_id AND s.host_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_stream_queue_stream ON public.stream_queue(stream_id, position);

-- ============ user_bans ============
CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can see active bans"
  ON public.user_bans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins or mods can ban"
  ON public.user_bans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Admins or mods can update/unban"
  ON public.user_bans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Admins can delete bans"
  ON public.user_bans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ chat_timeouts ============
CREATE TABLE IF NOT EXISTS public.chat_timeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  issued_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_timeouts TO authenticated;
GRANT ALL ON public.chat_timeouts TO service_role;
ALTER TABLE public.chat_timeouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat timeouts viewable by authenticated"
  ON public.chat_timeouts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Host or mod can issue timeout"
  ON public.chat_timeouts FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = chat_timeouts.stream_id AND s.host_id = auth.uid())
  );

CREATE POLICY "Host or mod can end timeout"
  ON public.chat_timeouts FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = chat_timeouts.stream_id AND s.host_id = auth.uid())
  );

-- ============ chat_word_filter ============
CREATE TABLE IF NOT EXISTS public.chat_word_filter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_word_filter TO authenticated;
GRANT ALL ON public.chat_word_filter TO service_role;
ALTER TABLE public.chat_word_filter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Word filter viewable by authenticated"
  ON public.chat_word_filter FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins or mods can add words"
  ON public.chat_word_filter FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Admins or mods can delete words"
  ON public.chat_word_filter FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- ============ realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raise_hand_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_timeouts;
