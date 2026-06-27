CREATE TABLE IF NOT EXISTS public.request_idempotency (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  action text NOT NULL,
  response jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup
  ON public.request_idempotency (user_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at
  ON public.request_idempotency (created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_idempotency TO authenticated;
GRANT ALL ON public.request_idempotency TO service_role;

ALTER TABLE public.request_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own idempotency rows" ON public.request_idempotency;
CREATE POLICY "Users manage their own idempotency rows"
  ON public.request_idempotency
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages idempotency rows" ON public.request_idempotency;
CREATE POLICY "Service role manages idempotency rows"
  ON public.request_idempotency
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);