CREATE OR REPLACE FUNCTION public.has_entitlement(_user_id uuid, _perk text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND (
        (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR (s.status = 'canceled' AND s.current_period_end > now())
      )
      AND (
        (_perk = 'analytics_advanced' AND coalesce(s.plan_type, s.price_id) IN ('artist_pro','artist_monthly','bwf_artist_membership_monthly','label_plan'))
        OR (_perk = 'label_panel' AND coalesce(s.plan_type, s.price_id) = 'label_plan')
        OR (_perk = 'analytics_advanced' AND s.price_id IN ('artist_pro','artist_monthly','bwf_artist_membership_monthly','label_plan'))
        OR (_perk = 'label_panel' AND s.price_id = 'label_plan')
      )
  )
$$;
REVOKE ALL ON FUNCTION public.has_entitlement(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_entitlement(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.require_label_plan_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_entitlement(auth.uid(), 'label_panel') THEN
    RAISE EXCEPTION 'The Label Plan is required for this action' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS labels_require_label_plan ON public.labels;
CREATE TRIGGER labels_require_label_plan BEFORE INSERT ON public.labels
  FOR EACH ROW EXECUTE FUNCTION public.require_label_plan_guard();
DROP TRIGGER IF EXISTS label_invites_require_label_plan ON public.label_invites;
CREATE TRIGGER label_invites_require_label_plan BEFORE INSERT ON public.label_invites
  FOR EACH ROW EXECUTE FUNCTION public.require_label_plan_guard();