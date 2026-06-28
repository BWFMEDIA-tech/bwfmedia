-- 1. REVENUE CONSOLIDATION ----------------------------------------------
-- Drop orphaned events table. revenue_ledger is the source of truth.
DROP TABLE IF EXISTS public.revenue_events CASCADE;

-- Lock record_revenue_event so only SECURITY DEFINER callers (i.e.
-- record_revenue_ledger) can invoke it. External clients must use the ledger.
REVOKE EXECUTE ON FUNCTION public.record_revenue_event(text, bigint, timestamptz, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
-- service_role + the ledger fn (which runs as definer) keep access.

-- 2. BOOST UNIFICATION ---------------------------------------------------
DROP FUNCTION IF EXISTS public.consume_play_boost_credit();

-- Generic ledger-based decrement for non-track boost spending
-- (battle-vote weight boost, queue boost). Returns new balance or raises.
CREATE OR REPLACE FUNCTION public.spend_boost_credit(
  _reason text DEFAULT 'spend_boost',
  _reference_id text DEFAULT NULL,
  _amount integer DEFAULT 1
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  current_balance integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 100 THEN
    RAISE EXCEPTION 'Invalid boost amount';
  END IF;
  IF _reason NOT IN ('spend_boost','spend_priority_review') THEN
    RAISE EXCEPTION 'Invalid boost reason';
  END IF;

  PERFORM 1 FROM public.play_boost_credits WHERE user_id = uid FOR UPDATE;
  SELECT COALESCE(credits, 0) INTO current_balance
  FROM public.play_boost_credits WHERE user_id = uid;
  IF current_balance IS NULL THEN current_balance := 0; END IF;
  IF current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient boost credits (have %, need %)', current_balance, _amount
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.boost_credit_ledger
    (user_id, delta, reason, reference_id, balance_after, metadata)
  VALUES
    (uid, -_amount, _reason, _reference_id, current_balance - _amount,
     jsonb_build_object('amount', _amount));

  RETURN current_balance - _amount;
END $$;

REVOKE EXECUTE ON FUNCTION public.spend_boost_credit(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_boost_credit(text, text, integer) TO authenticated;