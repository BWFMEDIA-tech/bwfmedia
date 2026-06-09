
-- Remove the permissive policy that exposed stripe_session_id to any signed-in user.
DROP POLICY IF EXISTS "Paid tips readable for safe view" ON public.tips;

-- Recreate the public view as SECURITY DEFINER so anon can read it without
-- needing an RLS-allowing SELECT policy on the base table.
DROP VIEW IF EXISTS public.tips_public;

CREATE VIEW public.tips_public
WITH (security_invoker = off) AS
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
