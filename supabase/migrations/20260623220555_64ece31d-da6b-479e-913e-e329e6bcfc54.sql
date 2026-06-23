
ALTER TABLE public.play_tracks
  ADD COLUMN IF NOT EXISTS play_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_track_play_count(_track_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_count integer;
BEGIN
  IF _track_id IS NULL THEN
    RAISE EXCEPTION 'track id required';
  END IF;
  UPDATE public.play_tracks
     SET play_count = COALESCE(play_count, 0) + 1
   WHERE id = _track_id
   RETURNING play_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_track_play_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_track_play_count(uuid) TO authenticated, service_role;
