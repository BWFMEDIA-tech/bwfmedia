-- Allow admins to record moderation entries in the audit history
CREATE POLICY "Admins can write audit log"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin-initiated takedown: mark as requested then run the existing approval path
CREATE OR REPLACE FUNCTION public.admin_takedown_release(_release_id uuid, _reason text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.distribution_releases
     SET takedown_status = 'requested',
         takedown_reason = COALESCE(NULLIF(_reason, ''), 'Removed by Tunevio admin'),
         takedown_requested_at = now()
   WHERE id = _release_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Release not found';
  END IF;

  _result := public.approve_release_takedown(_release_id);
  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_takedown_release(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_takedown_release(uuid, text) TO authenticated;