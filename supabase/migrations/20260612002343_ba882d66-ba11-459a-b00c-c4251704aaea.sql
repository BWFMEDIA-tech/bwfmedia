
DROP POLICY IF EXISTS "play_votes select authenticated" ON public.play_votes;
CREATE POLICY "play_votes select own" ON public.play_votes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE SELECT ON public.play_tracks FROM authenticated;
REVOKE SELECT ON public.play_tracks FROM anon;
GRANT SELECT (
  id, stream_id, artist_name, title, audio_url, cover_url, duration_seconds,
  boosted, position, status, score, like_count, dislike_count,
  created_at, updated_at
) ON public.play_tracks TO authenticated;

CREATE POLICY "users log own blocked access" ON public.stream_studio_access_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
