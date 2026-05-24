
CREATE TABLE public.live_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  artist_name text NOT NULL,
  email text NOT NULL,
  song_link text NOT NULL,
  message text,
  tier text NOT NULL CHECK (tier IN ('basic','featured','premium')),
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  queue_status text NOT NULL DEFAULT 'queued' CHECK (queue_status IN ('queued','next_up','live','done')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz
);

CREATE INDEX idx_live_submissions_status ON public.live_submissions(status);
CREATE INDEX idx_live_submissions_queue ON public.live_submissions(queue_status);
CREATE INDEX idx_live_submissions_session ON public.live_submissions(stripe_session_id);

ALTER TABLE public.live_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a live submission"
ON public.live_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view live submissions"
ON public.live_submissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update live submissions"
ON public.live_submissions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
