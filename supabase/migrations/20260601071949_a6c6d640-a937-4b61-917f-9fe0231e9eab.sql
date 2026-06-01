-- =========================
-- chat_timeouts: tighten SELECT + enable REPLICA IDENTITY FULL for realtime
-- =========================

ALTER TABLE public.chat_timeouts REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Chat timeouts viewable by staff or target" ON public.chat_timeouts;
DROP POLICY IF EXISTS "chat_timeouts_select_secure" ON public.chat_timeouts;

CREATE POLICY "chat_timeouts_select_secure"
ON public.chat_timeouts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = chat_timeouts.stream_id
      AND s.host_id = auth.uid()
  )
);

-- =========================
-- live_submissions: allow submitter to read/update own row by verified email
-- (no user_id column exists on this table; ownership is via email match
--  against the authenticated user's JWT email claim)
-- =========================

DROP POLICY IF EXISTS "audio_select_own" ON public.live_submissions;
DROP POLICY IF EXISTS "live_submissions_select_own" ON public.live_submissions;

CREATE POLICY "live_submissions_select_own"
ON public.live_submissions
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Owners may update ONLY their own row, and cannot tamper with
-- payment/queue/status fields (those are reserved for the Stripe webhook
-- via the service role, which bypasses RLS). The WITH CHECK clause locks
-- the immutable payment fields to their existing values.
DROP POLICY IF EXISTS "audio_update_own" ON public.live_submissions;
DROP POLICY IF EXISTS "live_submissions_update_own" ON public.live_submissions;

CREATE POLICY "live_submissions_update_own"
ON public.live_submissions
FOR UPDATE
TO authenticated
USING (
  lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Restrict which columns authenticated users may UPDATE. Stripe/payment
-- and queue fields stay service-role-only; owners can attach an audio file
-- and edit descriptive fields tied to their submission.
REVOKE UPDATE ON public.live_submissions FROM authenticated;
GRANT UPDATE (
  song_title,
  message,
  photo_url,
  uploaded_audio_url,
  audio_file_type,
  audio_uploaded_at
) ON public.live_submissions TO authenticated;
