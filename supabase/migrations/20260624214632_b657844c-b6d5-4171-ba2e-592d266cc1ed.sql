CREATE TABLE public.waitlist_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.waitlist_emails TO anon;
GRANT SELECT, INSERT ON public.waitlist_emails TO authenticated;
GRANT ALL ON public.waitlist_emails TO service_role;

ALTER TABLE public.waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up to the waitlist
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist_emails
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(email) <= 320);

-- Allow anyone to read just the count (we'll use head/count queries; SELECT policy required)
-- Restrict reads: only return rows when querying count(*); to keep emails private,
-- we expose only count via an RPC. Block direct SELECT.
CREATE POLICY "Admins can read waitlist"
  ON public.waitlist_emails
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public count function so the landing page can show a live counter without exposing emails
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.waitlist_emails;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon, authenticated;
