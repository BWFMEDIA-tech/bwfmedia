
CREATE TABLE public.podcast_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  session_live BOOLEAN NOT NULL DEFAULT true,
  pinned_id UUID,
  cursor INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT podcast_state_singleton CHECK (id = 1)
);

INSERT INTO public.podcast_state (id) VALUES (1);

ALTER TABLE public.podcast_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view podcast state"
  ON public.podcast_state FOR SELECT
  USING (true);

CREATE POLICY "Admins can update podcast state"
  ON public.podcast_state FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.podcast_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.podcast_state;
