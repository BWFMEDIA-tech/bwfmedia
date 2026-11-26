CREATE TABLE public.artist_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('bronze','silver','gold','platinum','diamond')),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','revoked')),
  eligible_streams_at_issue bigint NOT NULL DEFAULT 0,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, level)
);
GRANT SELECT ON public.artist_certifications TO authenticated;
GRANT ALL ON public.artist_certifications TO service_role;
ALTER TABLE public.artist_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists and admins read certifications" ON public.artist_certifications
  FOR SELECT TO authenticated
  USING (artist_id = (select auth.uid()) OR (select public.has_role((select auth.uid()), 'admin')));

CREATE OR REPLACE FUNCTION public.get_certification_streams(_artist_id uuid)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (auth.uid() IS NULL OR (auth.uid() <> _artist_id AND NOT public.has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN (SELECT count(*) FROM public.stream_events WHERE artist_id = _artist_id AND valid_stream = true);
END; $$;
REVOKE ALL ON FUNCTION public.get_certification_streams(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_certification_streams(uuid) TO authenticated, service_role;