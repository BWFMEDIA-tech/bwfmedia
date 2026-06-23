
CREATE TABLE public.artist_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, artist_id)
);

CREATE INDEX artist_follows_artist_id_idx ON public.artist_follows(artist_id);
CREATE INDEX artist_follows_follower_id_idx ON public.artist_follows(follower_id);

GRANT SELECT ON public.artist_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.artist_follows TO authenticated;
GRANT ALL ON public.artist_follows TO service_role;

ALTER TABLE public.artist_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON public.artist_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow as themselves"
  ON public.artist_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow themselves"
  ON public.artist_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);
