
CREATE OR REPLACE FUNCTION public.get_artists_directory()
RETURNS TABLE (
  id uuid,
  public_id uuid,
  display_name text,
  stage_name text,
  username text,
  avatar_url text,
  banner_url text,
  bio text,
  genre text,
  genres text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.public_id, p.display_name, p.stage_name, p.username,
         p.avatar_url, p.banner_url, p.bio, p.genre, p.genres
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'artist'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_artists_directory() TO anon, authenticated;
