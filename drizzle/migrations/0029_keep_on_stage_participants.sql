-- lovable-cron-fallback-reviewed: replaces the existing every-minute cleanup job with the same cadence; only narrows what it deletes
SELECT cron.unschedule('stage-participants-cleanup');
SELECT cron.schedule('stage-participants-cleanup', '* * * * *', $$
  DELETE FROM public.stage_participants sp
  WHERE (sp.stage_role IN ('listener','green_room') AND sp.last_seen_at < now() - interval '2 minutes')
     OR (sp.last_seen_at < now() - interval '2 minutes'
         AND NOT EXISTS (SELECT 1 FROM public.streams s WHERE s.id = sp.stream_id AND s.status = 'live'));
$$);