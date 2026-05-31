
CREATE TABLE public.invite_codes (
  code text PRIMARY KEY,
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE,
  allowed_role text NOT NULL DEFAULT 'listener' CHECK (allowed_role IN ('host','speaker','listener')),
  created_by uuid,
  expires_at timestamptz,
  uses integer NOT NULL DEFAULT 0,
  max_uses integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invite_codes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.invite_codes TO authenticated;
GRANT ALL ON public.invite_codes TO service_role;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invite codes readable by everyone"
  ON public.invite_codes FOR SELECT
  USING (true);

CREATE POLICY "Hosts or admins can create invite codes"
  ON public.invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (stream_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid()
    ))
  );

CREATE POLICY "Hosts or admins can update invite codes"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (stream_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid()
    ))
  );

CREATE POLICY "Hosts or admins can delete invite codes"
  ON public.invite_codes FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (stream_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid()
    ))
  );

-- Seed the well-known bwf-host invite (resolves to most recent live stream at request time)
INSERT INTO public.invite_codes (code, stream_id, allowed_role)
VALUES ('bwf-host', NULL, 'host')
ON CONFLICT (code) DO NOTHING;
