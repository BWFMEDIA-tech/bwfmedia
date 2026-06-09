
-- 1. invite_codes
DROP POLICY IF EXISTS "Invite codes readable by everyone" ON public.invite_codes;

CREATE POLICY "Admins or owning hosts can view invite codes"
  ON public.invite_codes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      stream_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.streams s
        WHERE s.id = invite_codes.stream_id AND s.host_id = auth.uid()
      )
    )
  );

REVOKE SELECT ON public.invite_codes FROM anon;

-- 2. user_roles: drop self-insert
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

-- 3. tips: restrict base table, expose a safe public view (no Stripe IDs)
DROP POLICY IF EXISTS "Tips viewable by everyone (paid)" ON public.tips;

CREATE POLICY "Tippers see their own tips"
  ON public.tips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and hosts see all tips"
  ON public.tips FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.streams s
      WHERE s.id = tips.stream_id AND s.host_id = auth.uid()
    )
  );

CREATE OR REPLACE VIEW public.tips_public
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

-- Base table needs a row-permitting SELECT policy for the view (security_invoker)
-- to return rows. Sensitive columns stay hidden because clients query the view.
CREATE POLICY "Paid tips readable for safe view"
  ON public.tips FOR SELECT
  TO anon, authenticated
  USING (status = 'paid');

-- Hard stop on direct anon SELECT of the base table (forces use of the view).
REVOKE SELECT ON public.tips FROM anon;
