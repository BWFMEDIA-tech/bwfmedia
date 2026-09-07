ALTER TABLE public.distribution_releases
  ADD COLUMN IF NOT EXISTS dsp_targets text[] NOT NULL DEFAULT ARRAY['spotify','apple-music','amazon-music','youtube-music','tidal','deezer']::text[];