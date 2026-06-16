
-- Explicitly block client-side writes to play_memberships and user_roles.
-- Service role bypasses RLS, so webhooks/admin code are unaffected.

-- play_memberships: lock down writes
CREATE POLICY "play_memberships no client insert" ON public.play_memberships
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "play_memberships no client update" ON public.play_memberships
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "play_memberships no client delete" ON public.play_memberships
  FOR DELETE TO authenticated, anon USING (false);

-- user_roles: prevent self-assignment / escalation
CREATE POLICY "user_roles no client insert" ON public.user_roles
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "user_roles no client update" ON public.user_roles
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "user_roles no client delete" ON public.user_roles
  FOR DELETE TO authenticated, anon USING (false);
