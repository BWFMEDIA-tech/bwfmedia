DROP POLICY IF EXISTS "label managers can edit roster releases" ON public.distribution_releases;
CREATE POLICY "label managers can edit roster releases" ON public.distribution_releases FOR UPDATE TO authenticated
  USING (public.label_manages_artist(auth.uid(), user_id, ARRAY['owner','manager']) AND status IN ('draft','rejected','submitted'))
  WITH CHECK (public.label_manages_artist(auth.uid(), user_id, ARRAY['owner','manager']) AND status IN ('draft','submitted'));

CREATE OR REPLACE FUNCTION public.battle_challenges_closed_status_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status IN ('declined','cancelled','completed')
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'This challenge is closed; send a new challenge instead';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS battle_challenges_closed_status_guard ON public.battle_challenges;
CREATE TRIGGER battle_challenges_closed_status_guard BEFORE UPDATE ON public.battle_challenges
  FOR EACH ROW EXECUTE FUNCTION public.battle_challenges_closed_status_guard();

CREATE OR REPLACE FUNCTION public.get_artist_follower_count(_artist_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN _artist_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _artist_id AND r.role IN ('artist','host'))
    THEN (SELECT count(*)::int FROM public.artist_follows WHERE artist_id = _artist_id)
    ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.get_total_revenue(_month date DEFAULT NULL::date)
RETURNS TABLE(month date, total_cents bigint, listener_cents bigint, artist_cents bigint, ads_cents bigint, tips_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    COALESCE(_month, public.month_bucket(now())),
    COALESCE(SUM(amount_cents),0)::bigint,
    COALESCE(SUM(amount_cents) FILTER (WHERE source='listener_subscription'),0)::bigint,
    COALESCE(SUM(amount_cents) FILTER (WHERE source='artist_subscription'),0)::bigint,
    COALESCE(SUM(amount_cents) FILTER (WHERE source='ads'),0)::bigint,
    COALESCE(SUM(amount_cents) FILTER (WHERE source IN ('tips','boost')),0)::bigint
  FROM public.revenue_pool_entries
  WHERE month = COALESCE(_month, public.month_bucket(now()))
    AND (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'))
$$;

GRANT SELECT ON public.battle_rounds TO anon;
DROP POLICY IF EXISTS battle_rounds_public_read ON public.battle_rounds;
CREATE POLICY battle_rounds_public_read ON public.battle_rounds FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.battle_matches bm WHERE bm.id = battle_rounds.match_id AND bm.status IN ('live','completed')));