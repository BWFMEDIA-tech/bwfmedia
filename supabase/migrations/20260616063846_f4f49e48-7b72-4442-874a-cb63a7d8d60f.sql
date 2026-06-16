
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('process-creator-payouts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-creator-payouts',
  '*/10 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app/api/public/hooks/process-payouts',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
