
-- payout_accounts: a creator's Stripe Connect Express account (per env)
CREATE TABLE public.payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  stripe_account_id text NOT NULL,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  country text,
  default_currency text NOT NULL DEFAULT 'usd',
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, environment),
  UNIQUE(stripe_account_id)
);

GRANT SELECT ON public.payout_accounts TO authenticated;
GRANT ALL ON public.payout_accounts TO service_role;

ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own payout account"
  ON public.payout_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin reads all payout accounts"
  ON public.payout_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payout_accounts_touch_updated_at
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- payout_requests: ledger of payout intents/transfers
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payout_account_id uuid REFERENCES public.payout_accounts(id) ON DELETE SET NULL,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','paid','failed','canceled')),
  stripe_transfer_id text UNIQUE,
  stripe_destination_id text,
  failure_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payout_requests_user_idx ON public.payout_requests(user_id, requested_at DESC);
CREATE INDEX payout_requests_status_idx ON public.payout_requests(status, environment);

GRANT SELECT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own payouts"
  ON public.payout_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "admin reads all payouts"
  ON public.payout_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payout_requests_touch_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Balance helper: lifetime earnings (paid tips + merch commissions) minus payouts not in 'failed'/'canceled'.
CREATE OR REPLACE FUNCTION public.get_creator_balance_cents(_user_id uuid)
RETURNS TABLE(
  earned_cents bigint,
  tips_cents bigint,
  merch_cents bigint,
  paid_out_cents bigint,
  pending_cents bigint,
  available_cents bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tips_total AS (
    SELECT COALESCE(SUM(t.amount_cents), 0)::bigint AS cents
    FROM public.tips t
    JOIN public.streams s ON s.id = t.stream_id
    WHERE s.host_id = _user_id AND t.status = 'paid'
  ),
  merch_total AS (
    SELECT COALESCE(SUM(commission_cents), 0)::bigint AS cents
    FROM public.merch_commissions
    WHERE user_id = _user_id AND status <> 'refunded'
  ),
  paid_total AS (
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents
    FROM public.payout_requests
    WHERE user_id = _user_id AND status = 'paid'
  ),
  pending_total AS (
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents
    FROM public.payout_requests
    WHERE user_id = _user_id AND status IN ('queued','processing')
  )
  SELECT
    (tips_total.cents + merch_total.cents)         AS earned_cents,
    tips_total.cents                               AS tips_cents,
    merch_total.cents                              AS merch_cents,
    paid_total.cents                               AS paid_out_cents,
    pending_total.cents                            AS pending_cents,
    (tips_total.cents + merch_total.cents
       - paid_total.cents - pending_total.cents)   AS available_cents
  FROM tips_total, merch_total, paid_total, pending_total;
$$;

REVOKE ALL ON FUNCTION public.get_creator_balance_cents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_balance_cents(uuid) TO authenticated, service_role;
