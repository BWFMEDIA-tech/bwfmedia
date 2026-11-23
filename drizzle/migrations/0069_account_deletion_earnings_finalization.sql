CREATE OR REPLACE FUNCTION public.finalize_account_deletion_earnings(_stream_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s record; r record; pool bigint;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT id,host_id,status INTO s FROM public.streams WHERE id=_stream_id FOR UPDATE;
 IF s.id IS NULL OR s.status='live' THEN RAISE EXCEPTION 'Stream must be ended'; END IF;
 IF EXISTS(SELECT 1 FROM public.room_host_earnings WHERE stream_id=s.id) THEN RETURN; END IF;
 SELECT t.slug AS tier_slug,coalesce(h.custom_percentage,t.percentage) AS percentage,coalesce(h.status,'active') AS status
 INTO r FROM public.host_tiers t LEFT JOIN public.host_profiles h ON h.user_id=s.host_id
 WHERE t.id=coalesce(h.tier_id,(SELECT id FROM public.host_tiers WHERE slug='standard'));
 IF r.tier_slug IS NULL OR r.percentage IS NULL THEN RAISE EXCEPTION 'Host rate unavailable'; END IF;
 pool := public.room_eligible_pool_cents(s.id);
 INSERT INTO public.room_host_earnings(stream_id,host_id,tier_slug,eligible_pool_cents,host_percentage,host_amount_cents,status)
 VALUES(s.id,s.host_id,r.tier_slug,pool,r.percentage,floor(pool*r.percentage/100)::bigint,CASE WHEN r.status='frozen' THEN 'frozen' ELSE 'pending' END)
 ON CONFLICT(stream_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.finalize_account_deletion_earnings(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_account_deletion_earnings(uuid) TO service_role;
DO $$ DECLARE definition text; BEGIN
 definition := pg_get_functiondef('public.prepare_account_deletion(uuid)'::regprocedure);
 EXECUTE replace(definition,'PERFORM public.finalize_room_earnings(t.id);','PERFORM public.finalize_account_deletion_earnings(t.id);');
END $$;