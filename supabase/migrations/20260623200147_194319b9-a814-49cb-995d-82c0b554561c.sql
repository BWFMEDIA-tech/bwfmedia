-- Play Arena Submissions routing table
CREATE TABLE public.play_arena_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id uuid NOT NULL,
  arena_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','playing','played','skipped')),
  priority text NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard','boosted','featured')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  play_track_id uuid REFERENCES public.play_tracks(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.play_arena_submissions TO authenticated;
GRANT SELECT ON public.play_arena_submissions TO anon;
GRANT ALL ON public.play_arena_submissions TO service_role;

ALTER TABLE public.play_arena_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view submissions"
  ON public.play_arena_submissions FOR SELECT
  USING (true);

CREATE POLICY "Artists insert own submissions"
  ON public.play_arena_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artist or host updates submission"
  ON public.play_arena_submissions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = artist_id
    OR public.is_stream_host(auth.uid(), arena_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = artist_id
    OR public.is_stream_host(auth.uid(), arena_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Host or admin deletes submission"
  ON public.play_arena_submissions FOR DELETE
  TO authenticated
  USING (
    public.is_stream_host(auth.uid(), arena_id)
    OR public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = artist_id AND status = 'queued')
  );

CREATE UNIQUE INDEX play_arena_submissions_active_song_uniq
  ON public.play_arena_submissions (arena_id, song_id)
  WHERE status IN ('queued','playing');

CREATE INDEX play_arena_submissions_queue_idx
  ON public.play_arena_submissions (arena_id, status, priority, submitted_at);

CREATE TRIGGER play_arena_submissions_touch
  BEFORE UPDATE ON public.play_arena_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.play_arena_submissions;
