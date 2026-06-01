-- 1. BLOCK BOOKINGS - lock down INSERT + payment fields
ALTER TABLE public.block_bookings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.block_bookings ALTER COLUMN amount_paid_cents DROP DEFAULT;
ALTER TABLE public.block_bookings ALTER COLUMN stripe_session_id DROP DEFAULT;
ALTER TABLE public.block_bookings ALTER COLUMN stripe_payment_intent_id DROP DEFAULT;
ALTER TABLE public.block_bookings ALTER COLUMN paid_at DROP DEFAULT;

DROP POLICY IF EXISTS "Anyone can submit a booking" ON public.block_bookings;
DROP POLICY IF EXISTS "block_bookings_insert" ON public.block_bookings;
CREATE POLICY "block_bookings_insert"
ON public.block_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND amount_paid_cents IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
  AND paid_at IS NULL
);

-- 2. STUDIO BOOKINGS - prevent fake paid bookings
ALTER TABLE public.studio_bookings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.studio_bookings ALTER COLUMN amount_paid_cents DROP DEFAULT;
ALTER TABLE public.studio_bookings ALTER COLUMN stripe_session_id DROP DEFAULT;
ALTER TABLE public.studio_bookings ALTER COLUMN stripe_payment_intent_id DROP DEFAULT;
ALTER TABLE public.studio_bookings ALTER COLUMN paid_at DROP DEFAULT;

DROP POLICY IF EXISTS "Anyone can submit a studio booking" ON public.studio_bookings;
DROP POLICY IF EXISTS "studio_bookings_insert" ON public.studio_bookings;
CREATE POLICY "studio_bookings_insert"
ON public.studio_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND amount_paid_cents IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
  AND paid_at IS NULL
);

-- 3. LIVE SUBMISSIONS - prevent fake approval / queue manipulation
ALTER TABLE public.live_submissions ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.live_submissions ALTER COLUMN queue_status SET DEFAULT 'queued';
ALTER TABLE public.live_submissions ALTER COLUMN uploaded_audio_url DROP DEFAULT;
ALTER TABLE public.live_submissions ALTER COLUMN stripe_session_id DROP DEFAULT;
ALTER TABLE public.live_submissions ALTER COLUMN stripe_payment_intent_id DROP DEFAULT;
ALTER TABLE public.live_submissions ALTER COLUMN paid_at DROP DEFAULT;

DROP POLICY IF EXISTS "Anyone can submit a live submission" ON public.live_submissions;
DROP POLICY IF EXISTS "live_submissions_insert" ON public.live_submissions;
CREATE POLICY "live_submissions_insert"
ON public.live_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND queue_status = 'queued'
  AND uploaded_audio_url IS NULL
  AND stripe_session_id IS NULL
  AND stripe_payment_intent_id IS NULL
  AND paid_at IS NULL
  AND audio_uploaded_at IS NULL
);

-- Let submitters read their own row by matching their auth email
DROP POLICY IF EXISTS "live_submissions_select_own" ON public.live_submissions;
CREATE POLICY "live_submissions_select_own"
ON public.live_submissions
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
);

-- 4. TIPS - explicitly deny client inserts (service role bypasses RLS)
DROP POLICY IF EXISTS "tips_insert_service_only" ON public.tips;
CREATE POLICY "tips_insert_service_only"
ON public.tips
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

-- 5. Harden grants - remove anon update/insert privileges where not needed
REVOKE UPDATE ON public.block_bookings FROM anon;
REVOKE UPDATE ON public.studio_bookings FROM anon;
REVOKE UPDATE ON public.live_submissions FROM anon;
REVOKE INSERT ON public.tips FROM anon, authenticated;
