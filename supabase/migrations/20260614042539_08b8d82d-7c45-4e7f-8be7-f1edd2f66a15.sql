
-- 1. Tighten is_stream_host: strictly the stream owner (no co_host escalation).
CREATE OR REPLACE FUNCTION public.is_stream_host(_user_id uuid, _stream_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = _stream_id AND s.host_id = _user_id
  )
$$;

-- Separate helper for ops that legitimately allow co_hosts (not used by RLS by default).
CREATE OR REPLACE FUNCTION public.is_stream_host_or_cohost(_user_id uuid, _stream_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.streams s WHERE s.id = _stream_id AND s.host_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.stage_participants sp
    WHERE sp.stream_id = _stream_id AND sp.user_id = _user_id
      AND sp.stage_role IN ('host','co_host')
  )
$$;

-- 2. Shopify access token: remove client-visible SELECT policy.
DROP POLICY IF EXISTS "owner read store meta" ON public.shopify_stores;

-- 3. block_bookings: add nullable owner column + owner SELECT policy.
ALTER TABLE public.block_bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS block_bookings_user_id_idx ON public.block_bookings(user_id);
DROP POLICY IF EXISTS "block_bookings_select_own" ON public.block_bookings;
CREATE POLICY "block_bookings_select_own" ON public.block_bookings
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 4. studio_bookings: same treatment.
ALTER TABLE public.studio_bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS studio_bookings_user_id_idx ON public.studio_bookings(user_id);
DROP POLICY IF EXISTS "studio_bookings_select_own" ON public.studio_bookings;
CREATE POLICY "studio_bookings_select_own" ON public.studio_bookings
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 5. live_submissions: enforce email matches authenticated user's email.
DROP POLICY IF EXISTS "live_submissions_insert_authenticated" ON public.live_submissions;
CREATE POLICY "live_submissions_insert_authenticated" ON public.live_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND queue_status = 'queued'
    AND uploaded_audio_url IS NULL
    AND stripe_session_id IS NULL
    AND stripe_payment_intent_id IS NULL
    AND paid_at IS NULL
    AND audio_uploaded_at IS NULL
    AND (auth.jwt() ->> 'email') IS NOT NULL
    AND lower(email) = lower(auth.jwt() ->> 'email')
  );

-- 6. play_tracks audio_url: revoke column read for general authenticated role.
--    Server functions use service_role (supabaseAdmin) which is unaffected.
REVOKE SELECT (audio_url) ON public.play_tracks FROM authenticated;
REVOKE SELECT (audio_url) ON public.play_tracks FROM anon;

-- 7. profiles: split public-readable columns from sensitive presence/interests.
--    Revoke direct column reads of last_seen_at, interests, location from
--    non-owners; expose via a sanitized view (public_profiles already exists).
REVOKE SELECT (last_seen_at, interests, location) ON public.profiles FROM authenticated;
REVOKE SELECT (last_seen_at, interests, location) ON public.profiles FROM anon;
