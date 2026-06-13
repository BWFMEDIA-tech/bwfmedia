-- 1) Column-level revoke on play_tracks.artist_user_id
REVOKE SELECT (artist_user_id) ON public.play_tracks FROM authenticated;
REVOKE SELECT (artist_user_id) ON public.play_tracks FROM anon;

-- 2) Fix stage_participants privilege escalation
-- Remove circular self-reference: only stream owner (or admin) can add hosts/co_hosts.
DROP POLICY IF EXISTS "Host or admin can add stage participants" ON public.stage_participants;

CREATE POLICY "Stream owner or admin can add stage participants"
ON public.stage_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = stage_participants.stream_id
      AND s.host_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
