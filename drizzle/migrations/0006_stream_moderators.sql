CREATE TABLE public.stream_moderators (
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, user_id)
);
GRANT SELECT ON public.stream_moderators TO anon;
GRANT SELECT, INSERT, DELETE ON public.stream_moderators TO authenticated;
GRANT ALL ON public.stream_moderators TO service_role;
ALTER TABLE public.stream_moderators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see stream moderators" ON public.stream_moderators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Stream owner adds moderators" ON public.stream_moderators FOR INSERT TO authenticated
  WITH CHECK (public.is_stream_host(auth.uid(), stream_id) AND added_by = auth.uid());
CREATE POLICY "Stream owner removes moderators" ON public.stream_moderators FOR DELETE TO authenticated
  USING (public.is_stream_host(auth.uid(), stream_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_moderators;