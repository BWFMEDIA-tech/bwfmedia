REVOKE SELECT (stripe_account_id) ON public.payout_accounts FROM authenticated;
REVOKE SELECT (stripe_account_id) ON public.payout_accounts FROM anon;
GRANT SELECT (stripe_account_id) ON public.payout_accounts TO service_role;