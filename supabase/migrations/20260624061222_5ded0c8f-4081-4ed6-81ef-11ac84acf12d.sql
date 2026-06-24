
-- Allow artists to delete ANY of their own tracks (not only queued ones)
DROP POLICY IF EXISTS "play_tracks artist delete own queued" ON public.play_tracks;
CREATE POLICY "play_tracks artist delete own"
ON public.play_tracks
FOR DELETE
TO authenticated
USING (artist_user_id = auth.uid());

-- Per-artist "profile library" stream, created on demand.
CREATE OR REPLACE FUNCTION public.get_or_create_profile_stream()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  sid uuid;
  rname text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT id INTO sid
  FROM public.streams
  WHERE host_id = uid AND title = '__profile_library__'
  LIMIT 1;

  IF sid IS NOT NULL THEN
    RETURN sid;
  END IF;

  rname := 'profile-library-' || uid::text;
  INSERT INTO public.streams (host_id, title, room_name, status, mode)
  VALUES (uid, '__profile_library__', rname, 'idle', 'play')
  RETURNING id INTO sid;

  RETURN sid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_profile_stream() TO authenticated;
