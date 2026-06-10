ALTER TABLE public.podcast_state
  ADD COLUMN IF NOT EXISTS playing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_idx integer NOT NULL DEFAULT 0;