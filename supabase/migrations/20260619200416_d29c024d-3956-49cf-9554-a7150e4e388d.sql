
-- Tighten play_tracks INSERT: artist must be a stream participant or the host (or admin).
DROP POLICY IF EXISTS "play_tracks artist insert own" ON public.play_tracks;
CREATE POLICY "play_tracks artist insert own"
  ON public.play_tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    artist_user_id = auth.uid()
    AND (
      public.is_stream_participant(auth.uid(), stream_id)
      OR public.is_stream_host(auth.uid(), stream_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Tighten play-mode chat INSERT: sender must also be joined to the stream
-- (host, stage participant, or moderator/admin), matching the non-play policy.
DROP POLICY IF EXISTS "Authenticated users can send play mode messages" ON public.stream_messages;
CREATE POLICY "Authenticated users can send play mode messages"
  ON public.stream_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.streams s
      WHERE s.id = stream_messages.stream_id AND s.mode = 'play'
    )
    AND (
      public.is_stream_host(auth.uid(), stream_messages.stream_id)
      OR public.is_stream_participant(auth.uid(), stream_messages.stream_id)
      OR public.has_role(auth.uid(), 'moderator'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
