-- Don't reap on-stage participants (host/co_host/speaker). Only audience-
-- adjacent rows (listener/green_room) should be cleaned up after inactivity.
-- Fixes: guest speakers being kicked back to audience after a brief
-- heartbeat lapse.

DO $$
BEGIN
  PERFORM cron.unschedule('stage-participants-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'stage-participants-cleanup',
  '* * * * *',
  $$ DELETE FROM public.stage_participants
     WHERE last_seen_at < now() - interval '5 minutes'
       AND stage_role IN ('listener','green_room'); $$
);
