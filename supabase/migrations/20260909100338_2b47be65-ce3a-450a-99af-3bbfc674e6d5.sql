CREATE OR REPLACE FUNCTION public.record_stream_event(
  p_track_id uuid,
  p_duration_played_seconds integer,
  p_full_listen boolean DEFAULT false,
  p_liked boolean DEFAULT false,
  p_saved boolean DEFAULT false,
  p_shared boolean DEFAULT false,
  p_client_session_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text := 'free';
  v_duration integer;
  v_row public.stream_events%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.play_tracks WHERE id = p_track_id) THEN
    RAISE EXCEPTION 'Unknown track';
  END IF;

  -- Tier is derived server-side; never trusted from the client.
  SELECT CASE
           WHEN s.status IN ('active','trialing') THEN 'premium'
           ELSE 'free'
         END
    INTO v_tier
    FROM public.subscriptions s
   WHERE s.user_id = v_uid
     AND s.status IN ('active','trialing')
   LIMIT 1;
  v_tier := COALESCE(v_tier, 'free');

  v_duration := LEAST(GREATEST(COALESCE(p_duration_played_seconds, 0), 0), 36000);

  INSERT INTO public.stream_events (
    user_id, track_id, duration_played_seconds, user_tier,
    full_listen, liked, saved, shared, client_session_id, metadata
  ) VALUES (
    v_uid, p_track_id, v_duration, v_tier,
    COALESCE(p_full_listen,false) AND v_duration >= 30,
    COALESCE(p_liked,false), COALESCE(p_saved,false), COALESCE(p_shared,false),
    p_client_session_id, COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'valid_stream', v_row.valid_stream,
    'duration_played_seconds', v_row.duration_played_seconds,
    'weighted_value', v_row.weighted_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_stream_event(uuid,integer,boolean,boolean,boolean,boolean,text,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_stream_event(uuid,integer,boolean,boolean,boolean,boolean,text,jsonb) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users insert their own stream events" ON public.stream_events;
REVOKE INSERT, UPDATE, DELETE ON public.stream_events FROM anon, authenticated;
GRANT ALL ON public.stream_events TO service_role;