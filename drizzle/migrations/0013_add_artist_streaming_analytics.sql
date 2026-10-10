CREATE INDEX IF NOT EXISTS stream_events_artist_created_idx
  ON public.stream_events (artist_id, created_at DESC)
  WHERE valid_stream = true;

CREATE OR REPLACE FUNCTION public.get_my_streaming_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 30), 7), 365);
  v_since timestamptz := now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 7), 365));
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  WITH own_events AS (
    SELECT
      e.id,
      e.track_id,
      e.user_id,
      e.created_at,
      e.duration_played_seconds,
      e.full_listen,
      e.liked,
      e.saved,
      e.shared,
      COALESCE(NULLIF(e.metadata->>'country', ''), NULLIF(e.metadata->>'country_name', ''), 'Unknown') AS country,
      COALESCE(NULLIF(e.metadata->>'city', ''), 'Unknown') AS city,
      COALESCE(NULLIF(e.metadata->>'region', ''), NULLIF(e.metadata->>'continent', ''), 'Unknown') AS region
    FROM public.stream_events e
    WHERE e.artist_id = v_user_id
      AND e.valid_stream = true
      AND e.created_at >= v_since
  ),
  all_time AS (
    SELECT
      count(*)::bigint AS total_streams,
      count(DISTINCT e.user_id)::bigint AS unique_listeners,
      count(DISTINCT NULLIF(COALESCE(e.metadata->>'country', e.metadata->>'country_name'), ''))::bigint AS countries
    FROM public.stream_events e
    WHERE e.artist_id = v_user_id AND e.valid_stream = true
  ),
  daily AS (
    SELECT date_trunc('day', created_at)::date AS day, count(*)::bigint AS streams
    FROM own_events GROUP BY 1 ORDER BY 1
  ),
  countries AS (
    SELECT country, count(*)::bigint AS streams, count(DISTINCT user_id)::bigint AS listeners
    FROM own_events GROUP BY country ORDER BY streams DESC, country LIMIT 20
  ),
  cities AS (
    SELECT city, country, count(*)::bigint AS streams
    FROM own_events WHERE city <> 'Unknown'
    GROUP BY city, country ORDER BY streams DESC, city LIMIT 20
  ),
  regions AS (
    SELECT region, count(*)::bigint AS streams
    FROM own_events GROUP BY region ORDER BY streams DESC, region LIMIT 12
  ),
  tracks AS (
    SELECT
      t.id,
      t.title,
      t.cover_url,
      count(e.id)::bigint AS streams,
      count(DISTINCT e.user_id)::bigint AS listeners,
      count(e.id) FILTER (WHERE e.full_listen)::bigint AS full_listens
    FROM public.play_tracks t
    LEFT JOIN own_events e ON e.track_id = t.id
    WHERE t.artist_user_id = v_user_id
    GROUP BY t.id, t.title, t.cover_url
    ORDER BY streams DESC, t.title
    LIMIT 10
  ),
  top_country AS (SELECT country, streams FROM countries ORDER BY streams DESC LIMIT 1),
  top_city AS (SELECT city, country, streams FROM cities ORDER BY streams DESC LIMIT 1),
  top_track AS (SELECT title, streams FROM tracks ORDER BY streams DESC LIMIT 1)
  SELECT jsonb_build_object(
    'rangeDays', v_days,
    'summary', jsonb_build_object(
      'totalStreams', a.total_streams,
      'uniqueListeners', a.unique_listeners,
      'countries', a.countries,
      'topCountry', COALESCE((SELECT jsonb_build_object('name', country, 'streams', streams) FROM top_country), 'null'::jsonb),
      'topCity', COALESCE((SELECT jsonb_build_object('name', city, 'country', country, 'streams', streams) FROM top_city), 'null'::jsonb),
      'topTrack', COALESCE((SELECT jsonb_build_object('name', title, 'streams', streams) FROM top_track), 'null'::jsonb)
    ),
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', day, 'streams', streams) ORDER BY day) FROM daily), '[]'::jsonb),
    'countries', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', country, 'streams', streams, 'listeners', listeners) ORDER BY streams DESC) FROM countries), '[]'::jsonb),
    'cities', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', city, 'country', country, 'streams', streams) ORDER BY streams DESC) FROM cities), '[]'::jsonb),
    'regions', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', region, 'streams', streams) ORDER BY streams DESC) FROM regions), '[]'::jsonb),
    'tracks', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'coverUrl', cover_url, 'streams', streams, 'listeners', listeners, 'fullListens', full_listens) ORDER BY streams DESC) FROM tracks), '[]'::jsonb)
  ) INTO v_result
  FROM all_time a;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_streaming_analytics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_streaming_analytics(integer) TO authenticated, service_role;