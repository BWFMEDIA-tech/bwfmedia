-- 0064 selected unaliased expressions INTO a record variable, so the record had no
-- "percentage"/"status" fields and the trigger raised 42703 when a room ended.
-- Name every column so the record fields exist, matching the get_host_rate() output names.
CREATE OR REPLACE FUNCTION public.streams_finalize_host_earnings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; pool bigint;
BEGIN
  IF NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    SELECT t.slug AS tier_slug,
           t.name AS tier_name,
           COALESCE(hp.custom_percentage, t.percentage) AS percentage,
           COALESCE(hp.status, 'active') AS status
      INTO r
      FROM public.host_tiers t
      LEFT JOIN public.host_profiles hp ON hp.user_id = NEW.host_id
     WHERE t.id = COALESCE(hp.tier_id, (SELECT id FROM public.host_tiers WHERE slug = 'standard'));

    -- No tier resolvable at all (standard tier missing): never block ending the room.
    IF r.tier_slug IS NULL OR r.percentage IS NULL THEN
      RETURN NEW;
    END IF;

    pool := public.room_eligible_pool_cents(NEW.id);
    INSERT INTO public.room_host_earnings(stream_id,host_id,tier_slug,eligible_pool_cents,host_percentage,host_amount_cents,status)
    VALUES (NEW.id, NEW.host_id, r.tier_slug, pool, r.percentage, floor(pool * r.percentage / 100)::bigint,
            CASE WHEN r.status = 'frozen' THEN 'frozen' ELSE 'pending' END)
    ON CONFLICT (stream_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;