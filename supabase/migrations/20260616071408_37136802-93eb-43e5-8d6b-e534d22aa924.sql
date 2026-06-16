-- Audit table for cross-user boost_spends access attempts
CREATE TABLE IF NOT EXISTS public.boost_spends_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  target_user_id uuid,
  action text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boost_spends_access_audit TO authenticated;
GRANT ALL ON public.boost_spends_access_audit TO service_role;

ALTER TABLE public.boost_spends_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read boost_spends audit" ON public.boost_spends_access_audit;
CREATE POLICY "Admins read boost_spends audit"
  ON public.boost_spends_access_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_boost_spends_audit_actor ON public.boost_spends_access_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boost_spends_audit_created ON public.boost_spends_access_audit(created_at DESC);

-- SECURITY DEFINER function used by RLS: logs cross-user attempts and returns access decision.
-- Owner → allow (no log). Admin → allow (no log). Anyone else → log + deny.
CREATE OR REPLACE FUNCTION public.boost_spends_access_check(_row_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  IF uid = _row_user_id THEN
    RETURN true;
  END IF;
  IF public.has_role(uid, 'admin') THEN
    RETURN true;
  END IF;

  -- Cross-user attempt by non-admin: audit and deny.
  -- Rate-limit by inserting at most one row per actor/target per minute to avoid log flooding.
  IF NOT EXISTS (
    SELECT 1 FROM public.boost_spends_access_audit
    WHERE actor_id = uid
      AND target_user_id = _row_user_id
      AND action = 'select_denied'
      AND created_at > now() - interval '1 minute'
  ) THEN
    INSERT INTO public.boost_spends_access_audit (actor_id, target_user_id, action, context)
    VALUES (uid, _row_user_id, 'select_denied',
            jsonb_build_object('auth_role', auth.role()));
  END IF;

  RETURN false;
END;
$$;

-- Replace SELECT policy on boost_spends with audited version
DROP POLICY IF EXISTS "Owners and admins read boost spends" ON public.boost_spends;
DROP POLICY IF EXISTS "Users can read own boost spends" ON public.boost_spends;
DROP POLICY IF EXISTS "Signed-in users can see boost weight per track" ON public.boost_spends;

CREATE POLICY "Boost spends owner read with audit"
  ON public.boost_spends
  FOR SELECT
  TO authenticated
  USING (public.boost_spends_access_check(user_id));
