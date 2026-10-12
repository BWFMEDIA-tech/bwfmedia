CREATE OR REPLACE FUNCTION public.get_artist_follower_count(_artist_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.artist_follows WHERE artist_id = _artist_id
$$;
REVOKE ALL ON FUNCTION public.get_artist_follower_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_artist_follower_count(uuid) TO anon, authenticated, service_role;