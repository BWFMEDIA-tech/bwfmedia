
-- =========================================================================
-- Stage Rooms — interactive participation entity (separate from streams)
-- =========================================================================
CREATE TABLE public.stage_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Stage',
  description text,
  status text NOT NULL DEFAULT 'idle',
  stage_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_count integer NOT NULL DEFAULT 0,
  livekit_room text NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stage_rooms_host_idx ON public.stage_rooms(host_id);
CREATE INDEX stage_rooms_status_idx ON public.stage_rooms(status);
CREATE UNIQUE INDEX stage_rooms_livekit_room_idx ON public.stage_rooms(livekit_room);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_rooms TO authenticated;
GRANT SELECT ON public.stage_rooms TO anon;
GRANT ALL ON public.stage_rooms TO service_role;

ALTER TABLE public.stage_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stage rooms"
  ON public.stage_rooms FOR SELECT
  USING (true);

CREATE POLICY "Hosts can create their stage rooms"
  ON public.stage_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their stage rooms"
  ON public.stage_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can delete their stage rooms"
  ON public.stage_rooms FOR DELETE TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));

-- Lifecycle validation: idle -> live -> ended (terminal)
CREATE OR REPLACE FUNCTION public.stage_rooms_enforce_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  allowed CONSTANT jsonb := jsonb_build_object(
    'idle',  jsonb_build_array('live','ended'),
    'live',  jsonb_build_array('ended'),
    'ended', jsonb_build_array()
  );
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (allowed ? OLD.status) THEN
      RAISE EXCEPTION 'Unknown stage_rooms.status %', OLD.status;
    END IF;
    IF NOT (allowed -> OLD.status ? NEW.status) THEN
      RAISE EXCEPTION 'Illegal stage_rooms.status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER stage_rooms_lifecycle
  BEFORE UPDATE ON public.stage_rooms
  FOR EACH ROW EXECUTE FUNCTION public.stage_rooms_enforce_lifecycle();

CREATE TRIGGER stage_rooms_touch_updated_at
  BEFORE UPDATE ON public.stage_rooms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- Broadcasts — distribution / viewing entity
-- =========================================================================
CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_title text NOT NULL DEFAULT 'Untitled Broadcast',
  description text,
  stream_status text NOT NULL DEFAULT 'scheduled',
  viewer_count integer NOT NULL DEFAULT 0,
  playback_source jsonb NOT NULL DEFAULT jsonb_build_object('kind','stage','stage_room_ids', '[]'::jsonb),
  featured_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX broadcasts_host_idx ON public.broadcasts(host_id);
CREATE INDEX broadcasts_status_idx ON public.broadcasts(stream_status);
CREATE INDEX broadcasts_started_at_idx ON public.broadcasts(started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT SELECT ON public.broadcasts TO anon;
GRANT ALL ON public.broadcasts TO service_role;

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view broadcasts"
  ON public.broadcasts FOR SELECT
  USING (true);

CREATE POLICY "Hosts can create their broadcasts"
  ON public.broadcasts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their broadcasts"
  ON public.broadcasts FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can delete their broadcasts"
  ON public.broadcasts FOR DELETE TO authenticated
  USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.broadcasts_enforce_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  allowed CONSTANT jsonb := jsonb_build_object(
    'scheduled', jsonb_build_array('live','ended'),
    'live',      jsonb_build_array('ended'),
    'ended',     jsonb_build_array()
  );
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stream_status IS DISTINCT FROM OLD.stream_status THEN
    IF NOT (allowed ? OLD.stream_status) THEN
      RAISE EXCEPTION 'Unknown broadcasts.stream_status %', OLD.stream_status;
    END IF;
    IF NOT (allowed -> OLD.stream_status ? NEW.stream_status) THEN
      RAISE EXCEPTION 'Illegal broadcasts.stream_status transition: % -> %', OLD.stream_status, NEW.stream_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER broadcasts_lifecycle
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.broadcasts_enforce_lifecycle();

CREATE TRIGGER broadcasts_touch_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- broadcast_stage_links — join table (1 broadcast : many stages)
-- =========================================================================
CREATE TABLE public.broadcast_stage_links (
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  stage_room_id uuid NOT NULL REFERENCES public.stage_rooms(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_id, stage_room_id)
);

CREATE INDEX broadcast_stage_links_stage_idx ON public.broadcast_stage_links(stage_room_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_stage_links TO authenticated;
GRANT SELECT ON public.broadcast_stage_links TO anon;
GRANT ALL ON public.broadcast_stage_links TO service_role;

ALTER TABLE public.broadcast_stage_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view broadcast links"
  ON public.broadcast_stage_links FOR SELECT USING (true);

CREATE POLICY "Broadcast hosts can manage links"
  ON public.broadcast_stage_links FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.broadcasts b WHERE b.id = broadcast_id AND (b.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.broadcasts b WHERE b.id = broadcast_id AND (b.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- =========================================================================
-- Realtime
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_stage_links;
