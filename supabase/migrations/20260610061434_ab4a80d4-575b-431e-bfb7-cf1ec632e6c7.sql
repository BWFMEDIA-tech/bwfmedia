
-- Persistent stream session tracking
ALTER TABLE public.stage_participants
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.stage_participants
  DROP CONSTRAINT IF EXISTS stage_participants_connection_status_check;
ALTER TABLE public.stage_participants
  ADD CONSTRAINT stage_participants_connection_status_check
  CHECK (connection_status IN ('connected','reconnecting','disconnected'));

CREATE INDEX IF NOT EXISTS idx_stage_participants_last_seen
  ON public.stage_participants (last_seen_at);

-- Allow users to update their own presence row (heartbeat / connection_status)
DROP POLICY IF EXISTS "User can update own presence" ON public.stage_participants;
CREATE POLICY "User can update own presence"
  ON public.stage_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inactivity cleanup: remove participants silent for > 2 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('stage-participants-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'stage-participants-cleanup',
  '* * * * *',
  $$ DELETE FROM public.stage_participants
     WHERE last_seen_at < now() - interval '2 minutes'; $$
);
