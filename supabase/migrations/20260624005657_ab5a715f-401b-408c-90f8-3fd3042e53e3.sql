
-- =========================
-- block_bookings
-- =========================
DROP POLICY IF EXISTS "block_bookings_insert" ON public.block_bookings;

CREATE POLICY "block_bookings_insert_authenticated"
ON public.block_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL
  AND user_id = auth.uid()
  AND status = 'pending'
  AND amount_paid_cents IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
  AND paid_at IS NULL
);

CREATE POLICY "block_bookings_delete_own_pending"
ON public.block_bookings
FOR DELETE
TO authenticated
USING (
  user_id IS NOT NULL
  AND user_id = auth.uid()
  AND status = 'pending'
  AND paid_at IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
);

-- =========================
-- studio_bookings
-- =========================
DROP POLICY IF EXISTS "studio_bookings_insert" ON public.studio_bookings;

CREATE POLICY "studio_bookings_insert_authenticated"
ON public.studio_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL
  AND user_id = auth.uid()
  AND status = 'pending'
  AND amount_paid_cents IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
  AND paid_at IS NULL
);

CREATE POLICY "studio_bookings_delete_own_pending"
ON public.studio_bookings
FOR DELETE
TO authenticated
USING (
  user_id IS NOT NULL
  AND user_id = auth.uid()
  AND status = 'pending'
  AND paid_at IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
);

-- =========================
-- profiles: hide `location` from other authenticated users
-- =========================
REVOKE SELECT (location) ON public.profiles FROM authenticated;
REVOKE SELECT (location) ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_profile_location()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT location FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile_location() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_location() TO authenticated;

-- =========================
-- stream_studio_access_log: constrain what authenticated users can log
-- =========================
DROP POLICY IF EXISTS "users log own blocked access" ON public.stream_studio_access_log;

CREATE POLICY "users log own blocked access"
ON public.stream_studio_access_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND action IN ('blocked', 'denied', 'redirected', 'access_attempt')
  AND route IS NOT NULL
  AND length(route) <= 256
  AND route ~ '^/[A-Za-z0-9/_.\-?=&%:#]*$'
  AND (metadata IS NULL OR pg_column_size(metadata) <= 2048)
);
