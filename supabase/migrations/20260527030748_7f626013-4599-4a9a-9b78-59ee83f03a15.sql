
CREATE TABLE public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID,
  display_name TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 50),
  message TEXT,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tips_stream ON public.tips(stream_id, paid_at DESC);

GRANT SELECT ON public.tips TO anon, authenticated;
GRANT ALL ON public.tips TO service_role;

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tips viewable by everyone (paid)"
  ON public.tips FOR SELECT TO anon, authenticated
  USING (status = 'paid');

CREATE POLICY "Host or admin can update tips"
  ON public.tips FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
  );

CREATE POLICY "Host or admin can delete tips"
  ON public.tips FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.tips;
ALTER TABLE public.tips REPLICA IDENTITY FULL;

CREATE TABLE public.stream_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  duration_seconds INTEGER,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recordings_stream ON public.stream_recordings(stream_id, created_at DESC);

GRANT SELECT ON public.stream_recordings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_recordings TO authenticated;
GRANT ALL ON public.stream_recordings TO service_role;

ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recordings viewable by everyone"
  ON public.stream_recordings FOR SELECT TO anon, authenticated
  USING (status = 'ready');

CREATE POLICY "Host can insert own recording"
  ON public.stream_recordings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host or admin can update recording"
  ON public.stream_recordings FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Host or admin can delete recording"
  ON public.stream_recordings FOR DELETE TO authenticated
  USING (auth.uid() = host_id OR has_role(auth.uid(), 'admin'::app_role));
