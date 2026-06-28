
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_type text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS price_cents integer,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_date timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_role_check') THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_role_check CHECK (role IS NULL OR role IN ('listener','artist'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON public.subscriptions(plan_type);

CREATE OR REPLACE FUNCTION public.has_active_tunevio_subscription(_user_id uuid, _role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE user_id = _user_id
       AND (_role IS NULL OR role = _role)
       AND (
         (status IN ('trialing','active','past_due')
          AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
  )
$$;
