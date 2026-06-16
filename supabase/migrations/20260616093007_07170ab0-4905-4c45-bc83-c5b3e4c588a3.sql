ALTER TABLE public.streams DROP CONSTRAINT IF EXISTS streams_mode_check;
ALTER TABLE public.streams ADD CONSTRAINT streams_mode_check CHECK (mode IN ('broadcast','stage','play'));