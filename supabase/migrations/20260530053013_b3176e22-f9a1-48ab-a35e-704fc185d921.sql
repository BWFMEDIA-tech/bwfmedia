
-- 1) Restrict tips Realtime broadcast to non-sensitive columns (exclude Stripe IDs)
ALTER PUBLICATION supabase_realtime DROP TABLE public.tips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tips
  (id, stream_id, user_id, display_name, amount_cents, message, status, created_at, paid_at);

-- 2) chat_timeouts: restrict SELECT to admins/mods, the stream host, or the timed-out user.
DROP POLICY IF EXISTS "Chat timeouts viewable by authenticated" ON public.chat_timeouts;
CREATE POLICY "Chat timeouts viewable by staff or target"
ON public.chat_timeouts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = chat_timeouts.stream_id AND s.host_id = auth.uid()
  )
);

-- 3) chat_word_filter: restrict SELECT to admins/mods only.
DROP POLICY IF EXISTS "Word filter viewable by authenticated" ON public.chat_word_filter;
CREATE POLICY "Word filter viewable by staff"
ON public.chat_word_filter
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
