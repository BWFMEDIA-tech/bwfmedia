CREATE TABLE public.track_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE INDEX track_likes_track_id_idx ON public.track_likes(track_id);

GRANT SELECT, INSERT, DELETE ON public.track_likes TO authenticated;
GRANT ALL ON public.track_likes TO service_role;

ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own track likes"
  ON public.track_likes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);