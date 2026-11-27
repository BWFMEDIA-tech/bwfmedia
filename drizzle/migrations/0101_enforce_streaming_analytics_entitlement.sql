DO $migration$
DECLARE
  definition text;
  anchor text := '  WITH own_events AS (';
BEGIN
  SELECT pg_get_functiondef('public.get_my_streaming_analytics(integer)'::regprocedure) INTO definition;
  IF position(anchor IN definition) = 0 THEN
    RAISE EXCEPTION 'Streaming analytics definition changed; refusing unsafe patch';
  END IF;
  definition := replace(definition, anchor, E'  IF NOT COALESCE(public.has_entitlement(v_user_id, ''analytics_advanced''), false) THEN\n    RAISE EXCEPTION ''Artist Pro or Label Plan required'' USING ERRCODE = ''42501'';\n  END IF;\n\n' || anchor);
  EXECUTE definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.get_my_streaming_analytics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_streaming_analytics(integer) TO authenticated, service_role;