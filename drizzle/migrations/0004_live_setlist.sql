CREATE TABLE public.live_setlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  track_id uuid,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  cover_url text,
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','playing','played')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_setlist_items_stream_idx ON public.live_setlist_items(stream_id, position);
GRANT SELECT ON public.live_setlist_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_setlist_items TO authenticated;
GRANT ALL ON public.live_setlist_items TO service_role;
ALTER TABLE public.live_setlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view setlists of live streams" ON public.live_setlist_items FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.status = 'live') OR public.is_stream_host(auth.uid(), stream_id));
CREATE POLICY "Stream owner inserts setlist" ON public.live_setlist_items FOR INSERT TO authenticated WITH CHECK (public.is_stream_host(auth.uid(), stream_id));
CREATE POLICY "Stream owner updates setlist" ON public.live_setlist_items FOR UPDATE TO authenticated USING (public.is_stream_host(auth.uid(), stream_id)) WITH CHECK (public.is_stream_host(auth.uid(), stream_id));
CREATE POLICY "Stream owner deletes setlist" ON public.live_setlist_items FOR DELETE TO authenticated USING (public.is_stream_host(auth.uid(), stream_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_setlist_items;