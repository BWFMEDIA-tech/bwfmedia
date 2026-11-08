CREATE OR REPLACE FUNCTION public.streams_finalize_host_earnings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; pool bigint;
BEGIN
  IF NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    SELECT * INTO r FROM public.get_host_rate(NEW.host_id);
    -- Hosts without an assigned tier earn nothing; never block ending the room.
    IF r.tier_slug IS NULL OR r.percentage IS NULL THEN
      RETURN NEW;
    END IF;
    pool := public.room_eligible_pool_cents(NEW.id);
    INSERT INTO public.room_host_earnings(stream_id,host_id,tier_slug,eligible_pool_cents,host_percentage,host_amount_cents,status)
    VALUES (NEW.id, NEW.host_id, r.tier_slug, pool, r.percentage, floor(pool * r.percentage / 100)::bigint,
            CASE WHEN r.status='frozen' THEN 'frozen' ELSE 'pending' END)
    ON CONFLICT (stream_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;