CREATE TABLE public.studio_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  session_type TEXT NOT NULL,
  crew_size TEXT NOT NULL,
  duration TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a studio booking"
ON public.studio_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE INDEX idx_studio_bookings_date ON public.studio_bookings(preferred_date);