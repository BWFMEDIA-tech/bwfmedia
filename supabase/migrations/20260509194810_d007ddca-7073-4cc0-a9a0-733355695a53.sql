
ALTER TABLE public.studio_bookings
  ADD COLUMN IF NOT EXISTS package_id text,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS amount_paid_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.block_bookings
  ADD COLUMN IF NOT EXISTS package_id text,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS amount_paid_cents integer,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_studio_bookings_session ON public.studio_bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_block_bookings_session ON public.block_bookings(stripe_session_id);

-- Update status validator to support new state machine
CREATE OR REPLACE FUNCTION public.validate_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('pending', 'awaiting_payment', 'confirmed', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Allow admins to view & update block_bookings (was missing)
DO $$ BEGIN
  CREATE POLICY "Admins can view block bookings"
    ON public.block_bookings FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update block bookings"
    ON public.block_bookings FOR UPDATE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public read by stripe_session_id is needed so the /pay return page can look up its own booking without auth.
-- We restrict it to rows that actually have a session attached, and only expose status + amount fields via the server fn.
-- (RLS still blocks raw select; the lookup happens via service-role server fn.)
