CREATE TABLE public.catalog_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  import_name text NOT NULL,
  distributor text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  tracks_detected int NOT NULL DEFAULT 0,
  releases_detected int NOT NULL DEFAULT 0,
  artists_detected int NOT NULL DEFAULT 0,
  isrcs_found int NOT NULL DEFAULT 0,
  tracks_imported int NOT NULL DEFAULT 0,
  releases_imported int NOT NULL DEFAULT 0,
  duplicates_skipped int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, idempotency_key),
  CONSTRAINT catalog_imports_status_chk CHECK (status IN ('processing','completed','partial','failed'))
);
CREATE INDEX catalog_imports_user_created_idx ON public.catalog_imports (user_id, created_at DESC);
GRANT SELECT ON public.catalog_imports TO authenticated;
GRANT ALL ON public.catalog_imports TO service_role;
ALTER TABLE public.catalog_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their catalog imports" ON public.catalog_imports FOR SELECT TO authenticated USING (auth.uid() = user_id);