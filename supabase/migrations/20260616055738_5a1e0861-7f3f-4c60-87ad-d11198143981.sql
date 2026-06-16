
CREATE TABLE public.submission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.live_submissions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  stripe_customer_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_payments_status_check
    CHECK (status IN ('pending','paid','failed','refunded','canceled')),
  CONSTRAINT submission_payments_environment_check
    CHECK (environment IN ('sandbox','live'))
);

CREATE INDEX idx_submission_payments_submission_id ON public.submission_payments(submission_id);
CREATE INDEX idx_submission_payments_user_id        ON public.submission_payments(user_id);
CREATE INDEX idx_submission_payments_status         ON public.submission_payments(status);

GRANT SELECT ON public.submission_payments TO authenticated;
GRANT ALL    ON public.submission_payments TO service_role;

ALTER TABLE public.submission_payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment records
CREATE POLICY "submission_payments select own"
  ON public.submission_payments
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Block all client-side writes. Service role bypasses RLS.
CREATE POLICY "submission_payments no client insert"
  ON public.submission_payments
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "submission_payments no client update"
  ON public.submission_payments
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "submission_payments no client delete"
  ON public.submission_payments
  FOR DELETE TO authenticated, anon USING (false);

-- updated_at maintenance
CREATE TRIGGER trg_submission_payments_touch_updated_at
  BEFORE UPDATE ON public.submission_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
