
-- 1) play_tracks: prevent artists from manipulating competitive fields
DROP POLICY IF EXISTS "play_tracks artist update own queued" ON public.play_tracks;

CREATE POLICY "play_tracks artist update own queued"
ON public.play_tracks
FOR UPDATE
TO authenticated
USING (artist_user_id = auth.uid() AND status = 'queued')
WITH CHECK (artist_user_id = auth.uid() AND status = 'queued');

CREATE OR REPLACE FUNCTION public.play_tracks_block_competitive_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Hosts/admins managing the track may change competitive fields
  IF EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = NEW.stream_id AND s.host_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.like_count IS DISTINCT FROM OLD.like_count
     OR NEW.dislike_count IS DISTINCT FROM OLD.dislike_count
     OR NEW.boosted IS DISTINCT FROM OLD.boosted
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.stream_id IS DISTINCT FROM OLD.stream_id
     OR NEW.artist_user_id IS DISTINCT FROM OLD.artist_user_id THEN
    RAISE EXCEPTION 'Cannot modify protected competition fields on play_tracks';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_play_tracks_block_competitive_writes ON public.play_tracks;
CREATE TRIGGER trg_play_tracks_block_competitive_writes
BEFORE UPDATE ON public.play_tracks
FOR EACH ROW EXECUTE FUNCTION public.play_tracks_block_competitive_writes();

-- 2) artist-audio: let authenticated users read their own uploaded play audio
CREATE POLICY "Users can read own play audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'artist-audio'
  AND (storage.foldername(name))[1] = 'play'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- 3) realtime.messages: allow authenticated users to subscribe to channels
DROP POLICY IF EXISTS "deny all" ON realtime.messages;
DROP POLICY IF EXISTS "Deny all" ON realtime.messages;

CREATE POLICY "Authenticated can receive realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
