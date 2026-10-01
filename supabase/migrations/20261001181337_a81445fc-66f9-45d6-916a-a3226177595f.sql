REVOKE INSERT, UPDATE, DELETE ON public.play_sessions FROM anon;
REVOKE SELECT ON public.arena_playback_state FROM anon;
GRANT SELECT (id, stream_id, current_track_id, position_seconds, is_playing, last_sync_at, created_at, updated_at) ON public.arena_playback_state TO anon;
DROP POLICY IF EXISTS "playback_state_select_all" ON public.arena_playback_state;
CREATE POLICY "playback_state_public_read" ON public.arena_playback_state FOR SELECT TO anon, authenticated USING (stream_id IS NOT NULL);