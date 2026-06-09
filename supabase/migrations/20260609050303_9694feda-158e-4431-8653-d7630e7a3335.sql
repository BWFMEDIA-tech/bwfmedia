
-- Replace the definer view with a security_invoker view
DROP VIEW IF EXISTS public.tips_public;

CREATE VIEW public.tips_public
WITH (security_invoker = on) AS
  SELECT
    id,
    stream_id,
    user_id,
    display_name,
    amount_cents,
    message,
    created_at
  FROM public.tips
  WHERE status = 'paid';

GRANT SELECT ON public.tips_public TO anon, authenticated;

-- Allow rows to flow through the view (RLS check)
DROP POLICY IF EXISTS "Paid tips readable for safe view" ON public.tips;
CREATE POLICY "Paid tips readable for safe view"
  ON public.tips FOR SELECT
  TO anon, authenticated
  USING (status = 'paid');

-- Column-level lockdown on the Stripe identifier columns so neither anon nor
-- authenticated can SELECT them through the base table. Admins / hosts who
-- need them go through service_role server functions.
REVOKE SELECT ON public.tips FROM anon, authenticated;
GRANT SELECT (id, stream_id, user_id, display_name, amount_cents,
              message, status, paid_at, created_at)
  ON public.tips TO authenticated;
-- anon stays without any direct base-table SELECT; uses the view only.
