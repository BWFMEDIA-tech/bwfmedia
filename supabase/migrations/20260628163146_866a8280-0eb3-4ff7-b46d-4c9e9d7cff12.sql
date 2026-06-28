
REVOKE EXECUTE ON FUNCTION public.record_revenue_event(text,bigint,timestamptz,uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_total_revenue(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calculate_monthly_revenue_pool(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_revenue_event(text,bigint,timestamptz,uuid,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_monthly_revenue_pool(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_total_revenue(date) TO authenticated, service_role;
