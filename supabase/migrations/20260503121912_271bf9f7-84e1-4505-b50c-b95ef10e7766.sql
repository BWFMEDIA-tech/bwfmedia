-- Create deck_leads table to capture investor info before deck access
CREATE TABLE public.deck_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  investor_type TEXT NOT NULL,
  investment_range TEXT NOT NULL,
  company TEXT,
  website_or_linkedin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deck_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous) can submit a lead
CREATE POLICY "Anyone can submit a deck lead"
ON public.deck_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- No public read access (leads are private to the owner)
-- Owner can view leads via the Lovable Cloud backend dashboard.

CREATE INDEX idx_deck_leads_created_at ON public.deck_leads(created_at DESC);
CREATE INDEX idx_deck_leads_email ON public.deck_leads(email);