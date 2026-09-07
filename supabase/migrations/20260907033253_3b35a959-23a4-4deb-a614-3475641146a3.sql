ALTER TABLE public.distribution_releases
  ADD COLUMN IF NOT EXISTS p_line_year integer,
  ADD COLUMN IF NOT EXISTS p_line_holder text,
  ADD COLUMN IF NOT EXISTS c_line_year integer,
  ADD COLUMN IF NOT EXISTS c_line_holder text,
  ADD COLUMN IF NOT EXISTS publisher_name text,
  ADD COLUMN IF NOT EXISTS pro_affiliation text,
  ADD COLUMN IF NOT EXISTS writer_credits jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rights_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS samples_cleared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rights_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS territory_mode text NOT NULL DEFAULT 'worldwide',
  ADD COLUMN IF NOT EXISTS territories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS upc_assigned_at timestamptz;

ALTER TABLE public.distribution_releases
  DROP CONSTRAINT IF EXISTS distribution_releases_territory_mode_check;
ALTER TABLE public.distribution_releases
  ADD CONSTRAINT distribution_releases_territory_mode_check
  CHECK (territory_mode IN ('worldwide', 'selected'));

ALTER TABLE public.distribution_release_tracks
  ADD COLUMN IF NOT EXISTS isrc_assigned_at timestamptz;

CREATE SEQUENCE IF NOT EXISTS public.distribution_upc_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.distribution_isrc_seq START 1;

CREATE OR REPLACE FUNCTION public.assign_release_identifiers(_release_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _upc text;
  _body text;
  _sum int;
  _digit int;
  _i int;
  _track record;
  _isrc text;
  _yy text := to_char(now(), 'YY');
  _tracks int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT upc INTO _upc FROM public.distribution_releases WHERE id = _release_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Release not found';
  END IF;

  IF _upc IS NULL OR _upc = '' THEN
    _body := '085' || lpad(nextval('public.distribution_upc_seq')::text, 8, '0');
    _sum := 0;
    FOR _i IN 1..11 LOOP
      _digit := substr(_body, _i, 1)::int;
      IF _i % 2 = 1 THEN _sum := _sum + _digit * 3; ELSE _sum := _sum + _digit; END IF;
    END LOOP;
    _upc := _body || ((10 - (_sum % 10)) % 10)::text;
    UPDATE public.distribution_releases
      SET upc = _upc, upc_assigned_at = now()
      WHERE id = _release_id;
  END IF;

  FOR _track IN
    SELECT id FROM public.distribution_release_tracks
    WHERE release_id = _release_id AND (isrc IS NULL OR isrc = '')
    ORDER BY track_number
  LOOP
    _isrc := 'QZTVO' || _yy || lpad(nextval('public.distribution_isrc_seq')::text, 5, '0');
    UPDATE public.distribution_release_tracks
      SET isrc = _isrc, isrc_assigned_at = now()
      WHERE id = _track.id;
    _tracks := _tracks + 1;
  END LOOP;

  RETURN jsonb_build_object('upc', _upc, 'tracks_assigned', _tracks);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_release_identifiers(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.assign_release_identifiers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_release_identifiers(uuid) TO service_role;