CREATE OR REPLACE FUNCTION public.get_revenue_pool_total(_month date DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_cents), 0)::bigint
  FROM public.revenue_pool_entries
  WHERE month = COALESCE(_month, public.month_bucket(now()));
$$;

REVOKE ALL ON FUNCTION public.get_revenue_pool_total(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_revenue_pool_total(date) TO anon, authenticated;