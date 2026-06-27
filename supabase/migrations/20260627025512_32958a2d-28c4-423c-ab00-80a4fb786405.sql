-- Restrict profiles SELECT to non-tracking columns by revoking column-level access to last_seen_at
REVOKE SELECT (last_seen_at) ON public.profiles FROM authenticated, anon;
-- Self-read continues via get_my_profile_last_seen_at()

-- arena_events: lock down all client writes explicitly (service-role only)
CREATE POLICY arena_events_no_client_insert ON public.arena_events FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY arena_events_no_client_update ON public.arena_events FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY arena_events_no_client_delete ON public.arena_events FOR DELETE TO authenticated, anon USING (false);