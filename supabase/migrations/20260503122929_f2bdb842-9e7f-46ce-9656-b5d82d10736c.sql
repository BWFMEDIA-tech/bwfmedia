CREATE TABLE public.block_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  shoot_type TEXT NOT NULL,
  location TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.block_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a booking"
ON public.block_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE INDEX idx_block_bookings_date ON public.block_bookings(preferred_date);