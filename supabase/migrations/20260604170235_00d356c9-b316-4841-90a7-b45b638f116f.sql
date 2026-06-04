
-- 1) Prevent users from tampering with payment fields on live_submissions
CREATE OR REPLACE FUNCTION public.live_submissions_block_payment_field_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.amount_paid_cents IS DISTINCT FROM OLD.amount_paid_cents
     OR NEW.queue_status IS DISTINCT FROM OLD.queue_status
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify protected payment/queue fields on live_submissions';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_submissions_block_payment_writes ON public.live_submissions;
CREATE TRIGGER trg_live_submissions_block_payment_writes
BEFORE UPDATE ON public.live_submissions
FOR EACH ROW EXECUTE FUNCTION public.live_submissions_block_payment_field_writes();

-- 2) Remove admin_audit_log from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_audit_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_audit_log';
  END IF;
END $$;

-- 3) Explicit storage policy for artist-audio bucket (service role + admins only)
DROP POLICY IF EXISTS "artist-audio service role read" ON storage.objects;
CREATE POLICY "artist-audio service role read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'artist-audio' AND auth.role() = 'service_role');
