-- lovable-cron-fallback-reviewed: Known future battle deadlines need validated result notification even after all clients close. One shared five-second job is armed on live battle creation and unscheduled after drain; maximum 17280 checks/day only during continuous active battles. Votes enforce exact deadlines independently.
CREATE FUNCTION public.freestyle_deadline_tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(73423192);
 PERFORM public.finalize_expired_freestyle_battles();
 IF NOT EXISTS(SELECT 1 FROM public.freestyle_battles WHERE status='live') THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='freestyle-deadlines';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.freestyle_deadline_tick() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.freestyle_deadline_tick() TO service_role;
CREATE FUNCTION public.freestyle_arm_deadline() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status='live' THEN
  PERFORM pg_advisory_xact_lock(73423192);
  IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='freestyle-deadlines') THEN
   PERFORM cron.schedule('freestyle-deadlines','5 seconds','SELECT public.freestyle_deadline_tick()');
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.freestyle_arm_deadline() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER freestyle_arm_deadline AFTER INSERT ON public.freestyle_battles FOR EACH ROW EXECUTE FUNCTION public.freestyle_arm_deadline();