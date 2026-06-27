CREATE TABLE IF NOT EXISTS public.request_idempotency (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  action TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS request_idempotency_user_action_idx
  ON public.request_idempotency (user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS request_idempotency_created_at_idx
  ON public.request_idempotency (created_at);

GRANT SELECT ON public.request_idempotency TO authenticated;
GRANT ALL ON public.request_idempotency TO service_role;

ALTER TABLE public.request_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own idempotency records"
  ON public.request_idempotency
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages idempotency"
  ON public.request_idempotency
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);