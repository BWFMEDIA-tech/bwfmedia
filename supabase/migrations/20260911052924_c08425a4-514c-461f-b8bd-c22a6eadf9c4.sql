
-- PLAYLISTS
CREATE TABLE public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT ON public.playlists TO anon;
GRANT ALL ON public.playlists TO service_role;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own playlists" ON public.playlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public playlists are readable" ON public.playlists FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE INDEX playlists_user_idx ON public.playlists(user_id);
CREATE TRIGGER playlists_touch BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.play_tracks(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, track_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_tracks TO authenticated;
GRANT SELECT ON public.playlist_tracks TO anon;
GRANT ALL ON public.playlist_tracks TO service_role;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own playlist tracks" ON public.playlist_tracks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
CREATE POLICY "Public playlist tracks are readable" ON public.playlist_tracks FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.is_public = true));
CREATE INDEX playlist_tracks_playlist_idx ON public.playlist_tracks(playlist_id, position);

CREATE TABLE public.playlist_follows (
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.playlist_follows TO authenticated;
GRANT ALL ON public.playlist_follows TO service_role;
ALTER TABLE public.playlist_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own playlist follows" ON public.playlist_follows FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SAVES
CREATE TABLE public.saved_tracks (
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.play_tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_tracks TO authenticated;
GRANT ALL ON public.saved_tracks TO service_role;
ALTER TABLE public.saved_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved tracks" ON public.saved_tracks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.saved_releases (
  user_id uuid NOT NULL,
  release_id uuid NOT NULL REFERENCES public.distribution_releases(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, release_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_releases TO authenticated;
GRANT ALL ON public.saved_releases TO service_role;
ALTER TABLE public.saved_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved releases" ON public.saved_releases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REACTIONS
CREATE TABLE public.track_reactions (
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.play_tracks(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like','fire','not_for_me')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_reactions TO authenticated;
GRANT ALL ON public.track_reactions TO service_role;
ALTER TABLE public.track_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own track reactions" ON public.track_reactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER track_reactions_touch BEFORE UPDATE ON public.track_reactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CHALLENGES
CREATE TABLE public.listener_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  metric text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  reward_points integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listener_challenges TO anon, authenticated;
GRANT ALL ON public.listener_challenges TO service_role;
ALTER TABLE public.listener_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges readable" ON public.listener_challenges FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage challenges" ON public.listener_challenges FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER listener_challenges_touch BEFORE UPDATE ON public.listener_challenges FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.listener_challenge_progress (
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.listener_challenges(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);
GRANT SELECT ON public.listener_challenge_progress TO authenticated;
GRANT ALL ON public.listener_challenge_progress TO service_role;
ALTER TABLE public.listener_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own challenge progress" ON public.listener_challenge_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER listener_challenge_progress_touch BEFORE UPDATE ON public.listener_challenge_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.listener_challenges (slug, title, description, metric, target, reward_points, sort_order) VALUES
  ('discover-5-artists','Discover 5 new artists','Listen to songs from five artists you have never played before.','distinct_artists_played',5,50,1),
  ('listen-new-releases','Listen to new releases','Play three songs released in the last 30 days.','new_release_plays',3,30,2),
  ('create-playlist','Create a playlist','Build your first playlist with at least three songs.','playlist_tracks',3,40,3),
  ('follow-artists','Follow new artists','Follow three artists you enjoy.','artists_followed',3,30,4),
  ('play-arena','Join Play Arena','Cast a vote in Play Arena.','arena_votes',1,25,5);

-- EXCLUSIVE FAN CONTENT
CREATE TABLE public.artist_exclusive_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  media_url text,
  content_type text NOT NULL DEFAULT 'update' CHECK (content_type IN ('update','behind_the_scenes','early_access','event','release')),
  visibility text NOT NULL DEFAULT 'followers' CHECK (visibility IN ('public','followers')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_exclusive_content TO authenticated;
GRANT SELECT ON public.artist_exclusive_content TO anon;
GRANT ALL ON public.artist_exclusive_content TO service_role;
ALTER TABLE public.artist_exclusive_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists manage own exclusive content" ON public.artist_exclusive_content FOR ALL TO authenticated USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Public exclusive content readable" ON public.artist_exclusive_content FOR SELECT TO anon, authenticated
  USING (visibility = 'public' AND published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "Followers read follower-only content" ON public.artist_exclusive_content FOR SELECT TO authenticated
  USING (visibility = 'followers' AND published_at IS NOT NULL AND published_at <= now()
         AND EXISTS (SELECT 1 FROM public.artist_follows f WHERE f.artist_id = artist_id AND f.follower_id = auth.uid()));
CREATE INDEX artist_exclusive_content_artist_idx ON public.artist_exclusive_content(artist_id, published_at DESC);
