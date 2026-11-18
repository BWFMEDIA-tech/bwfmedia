-- Host earnings must be recorded no matter who ends the room.
-- 0040 made get_host_rate() return rows only when _user_id = auth.uid() or the session is an
-- admin, so when a service-role cleanup (admin "Delete all live", bulk delete) or a moderator
-- ended a stream, the trigger saw no tier and 0061 turned that into a silent skip: the room
-- closed with no room_host_earnings row and the host's tips were never recorded.
-- Compute the identical rate (host profile tier, custom percentage, standard fallback) directly
-- from the tier tables inside this SECURITY DEFINER trigger so it no longer depends on the caller.
CREATE OR REPLACE FUNCTION public.streams_finalize_host_earnings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; pool bigint;
BEGIN
  IF NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    SELECT t.slug, t.name, COALESCE(hp.custom_percentage, t.percentage), COALESCE(hp.status, 'active')
      INTO r
      FROM public.host_tiers t
      LEFT JOIN public.host_profiles hp ON hp.user_id = NEW.host_id
     WHERE t.id = COALESCE(hp.tier_id, (SELECT id FROM public.host_tiers WHERE slug = 'standard'));

    -- No tier resolvable at all (standard tier missing): never block ending the room.
    IF r.slug IS NULL OR r.percentage IS NULL THEN
      RETURN NEW;
    END IF;

    pool := public.room_eligible_pool_cents(NEW.id);
    INSERT INTO public.room_host_earnings(stream_id,host_id,tier_slug,eligible_pool_cents,host_percentage,host_amount_cents,status)
    VALUES (NEW.id, NEW.host_id, r.slug, pool, r.percentage, floor(pool * r.percentage / 100)::bigint,
            CASE WHEN r.status = 'frozen' THEN 'frozen' ELSE 'pending' END)
    ON CONFLICT (stream_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;