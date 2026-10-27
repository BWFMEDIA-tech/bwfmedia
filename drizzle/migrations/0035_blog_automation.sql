ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qa_report jsonb,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS automation_run_id uuid,
  ADD COLUMN IF NOT EXISTS review_flag text;
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_automation_run_uidx ON public.blog_posts(automation_run_id) WHERE automation_run_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_content_hash_uidx ON public.blog_posts(content_hash) WHERE content_hash IS NOT NULL;
UPDATE public.blog_posts SET published_at = created_at WHERE published AND published_at IS NULL;

CREATE OR REPLACE FUNCTION public.blog_posts_published_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.published AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER blog_posts_published_at BEFORE INSERT OR UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.blog_posts_published_at();

CREATE TABLE public.blog_automation_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  auto_publish boolean NOT NULL DEFAULT false,
  publish_hour integer NOT NULL DEFAULT 9 CHECK (publish_hour BETWEEN 0 AND 23),
  timezone text NOT NULL DEFAULT 'America/Chicago',
  categories text[] NOT NULL DEFAULT ARRAY['evergreen','promotion','tutorial','spotlight'],
  monthly_budget_credits numeric NOT NULL DEFAULT 50,
  paused_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.blog_automation_settings TO authenticated;
GRANT ALL ON public.blog_automation_settings TO service_role;
ALTER TABLE public.blog_automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog auto settings admin" ON public.blog_automation_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.blog_automation_settings(id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.blog_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date,
  trigger text NOT NULL DEFAULT 'schedule',
  status text NOT NULL DEFAULT 'running',
  attempts integer NOT NULL DEFAULT 1,
  lease_until timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error text,
  retryable boolean NOT NULL DEFAULT false,
  post_id uuid,
  topic_id uuid,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_credits numeric NOT NULL DEFAULT 0,
  created_by uuid
);
CREATE UNIQUE INDEX blog_automation_runs_date_uidx ON public.blog_automation_runs(run_date) WHERE trigger = 'schedule';
GRANT SELECT ON public.blog_automation_runs TO authenticated;
GRANT ALL ON public.blog_automation_runs TO service_role;
ALTER TABLE public.blog_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog auto runs admin read" ON public.blog_automation_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.blog_topic_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar text NOT NULL,
  topic text NOT NULL,
  topic_key text NOT NULL UNIQUE,
  target_keyword text,
  planned_for date,
  status text NOT NULL DEFAULT 'planned',
  post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_topic_calendar TO authenticated;
GRANT ALL ON public.blog_topic_calendar TO service_role;
ALTER TABLE public.blog_topic_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog topics admin" ON public.blog_topic_calendar FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Server-only cron token: readable by the scheduler (postgres) and service role, never by app users.
CREATE TABLE public.blog_automation_secrets (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  cron_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32),'hex')
);
GRANT ALL ON public.blog_automation_secrets TO service_role;
REVOKE ALL ON public.blog_automation_secrets FROM anon, authenticated;
ALTER TABLE public.blog_automation_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.blog_automation_secrets(id) VALUES (true) ON CONFLICT DO NOTHING;