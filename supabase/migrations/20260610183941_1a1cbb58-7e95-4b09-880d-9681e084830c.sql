
-- ============ play_sessions ============
CREATE TABLE public.play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  current_track_id uuid,
  status text NOT NULL DEFAULT 'open', -- open | ended
  winner_track_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id)
);

GRANT SELECT ON public.play_sessions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.play_sessions TO authenticated;
GRANT ALL ON public.play_sessions TO service_role;

ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "play_sessions select all"
  ON public.play_sessions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "play_sessions host manages"
  ON public.play_sessions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============ play_tracks ============
CREATE TABLE public.play_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  artist_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  artist_name text NOT NULL,
  title text NOT NULL,
  audio_url text,
  cover_url text,
  duration_seconds int,
  boosted boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued', -- queued | playing | done
  score int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  dislike_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX play_tracks_stream_status_idx
  ON public.play_tracks (stream_id, status, boosted DESC, position ASC);

GRANT SELECT ON public.play_tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.play_tracks TO authenticated;
GRANT ALL ON public.play_tracks TO service_role;

ALTER TABLE public.play_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "play_tracks select all"
  ON public.play_tracks FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "play_tracks artist insert own"
  ON public.play_tracks FOR INSERT TO authenticated
  WITH CHECK (artist_user_id = auth.uid());

CREATE POLICY "play_tracks artist update own queued"
  ON public.play_tracks FOR UPDATE TO authenticated
  USING (artist_user_id = auth.uid() AND status = 'queued')
  WITH CHECK (artist_user_id = auth.uid());

CREATE POLICY "play_tracks artist delete own queued"
  ON public.play_tracks FOR DELETE TO authenticated
  USING (artist_user_id = auth.uid() AND status = 'queued');

CREATE POLICY "play_tracks host manages"
  ON public.play_tracks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============ play_votes ============
CREATE TABLE public.play_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.play_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, user_id)
);

CREATE INDEX play_votes_track_idx ON public.play_votes (track_id);

GRANT SELECT ON public.play_votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.play_votes TO authenticated;
GRANT ALL ON public.play_votes TO service_role;

ALTER TABLE public.play_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "play_votes select all"
  ON public.play_votes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "play_votes self insert"
  ON public.play_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND value IN (-1, 1));

CREATE POLICY "play_votes self update"
  ON public.play_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND value IN (-1, 1));

CREATE POLICY "play_votes self delete"
  ON public.play_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Trigger: keep play_tracks.score / like_count / dislike_count in sync.
CREATE OR REPLACE FUNCTION public.play_votes_recalc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE target_track uuid;
BEGIN
  target_track := COALESCE(NEW.track_id, OLD.track_id);
  UPDATE public.play_tracks t
  SET like_count    = COALESCE((SELECT COUNT(*) FROM public.play_votes v WHERE v.track_id = target_track AND v.value = 1), 0),
      dislike_count = COALESCE((SELECT COUNT(*) FROM public.play_votes v WHERE v.track_id = target_track AND v.value = -1), 0),
      score         = COALESCE((SELECT SUM(value)::int FROM public.play_votes v WHERE v.track_id = target_track), 0),
      updated_at    = now()
  WHERE t.id = target_track;
  RETURN NULL;
END;
$$;

CREATE TRIGGER play_votes_recalc_after
AFTER INSERT OR UPDATE OR DELETE ON public.play_votes
FOR EACH ROW EXECUTE FUNCTION public.play_votes_recalc();

-- ============ play_boost_credits ============
CREATE TABLE public.play_boost_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.play_boost_credits TO authenticated;
GRANT ALL ON public.play_boost_credits TO service_role;

ALTER TABLE public.play_boost_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "play_boost_credits self select"
  ON public.play_boost_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER play_sessions_touch BEFORE UPDATE ON public.play_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER play_tracks_touch BEFORE UPDATE ON public.play_tracks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER play_votes_touch BEFORE UPDATE ON public.play_votes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.play_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.play_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.play_votes;
