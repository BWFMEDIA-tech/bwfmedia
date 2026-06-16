
-- =========================================================
-- Phase 1: Boost Economy
-- =========================================================

CREATE TABLE public.boost_credit_packs (
  id text PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boost_credit_packs TO authenticated, anon;
GRANT ALL ON public.boost_credit_packs TO service_role;

ALTER TABLE public.boost_credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packs are publicly readable"
ON public.boost_credit_packs FOR SELECT
USING (active = true);

CREATE POLICY "Admins manage packs"
ON public.boost_credit_packs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


CREATE TABLE public.boost_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('purchase','spend_boost','spend_priority_review','admin_grant','refund','signup_bonus')),
  reference_id text,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_boost_ledger_user_created ON public.boost_credit_ledger (user_id, created_at DESC);
CREATE INDEX idx_boost_ledger_reference ON public.boost_credit_ledger (reference_id) WHERE reference_id IS NOT NULL;

GRANT SELECT ON public.boost_credit_ledger TO authenticated;
GRANT ALL ON public.boost_credit_ledger TO service_role;

ALTER TABLE public.boost_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ledger"
ON public.boost_credit_ledger FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all ledger"
ON public.boost_credit_ledger FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


CREATE TABLE public.boost_spends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.play_tracks(id) ON DELETE CASCADE,
  weight integer NOT NULL CHECK (weight > 0),
  credits_cost integer NOT NULL CHECK (credits_cost > 0),
  ledger_id uuid REFERENCES public.boost_credit_ledger(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_boost_spends_track ON public.boost_spends (track_id, expires_at);
CREATE INDEX idx_boost_spends_user ON public.boost_spends (user_id, created_at DESC);

GRANT SELECT ON public.boost_spends TO authenticated;
GRANT ALL ON public.boost_spends TO service_role;

ALTER TABLE public.boost_spends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can see boost weight per track"
ON public.boost_spends FOR SELECT
TO authenticated
USING (true);


CREATE OR REPLACE FUNCTION public.sync_play_boost_credits_from_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.play_boost_credits (user_id, credits, updated_at)
  VALUES (NEW.user_id, NEW.balance_after, now())
  ON CONFLICT (user_id)
  DO UPDATE SET credits = NEW.balance_after, updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_boost_ledger_sync ON public.boost_credit_ledger;
CREATE TRIGGER trg_boost_ledger_sync
AFTER INSERT ON public.boost_credit_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_play_boost_credits_from_ledger();


CREATE OR REPLACE FUNCTION public.spend_boost_on_track(
  _track_id uuid,
  _weight integer DEFAULT 1
)
RETURNS TABLE(new_balance integer, spend_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  current_balance integer;
  cost integer;
  new_ledger_id uuid;
  new_spend_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _weight IS NULL OR _weight < 1 OR _weight > 100 THEN
    RAISE EXCEPTION 'Invalid boost weight';
  END IF;

  cost := _weight;

  PERFORM 1 FROM public.play_boost_credits WHERE user_id = uid FOR UPDATE;

  SELECT COALESCE(credits, 0) INTO current_balance
  FROM public.play_boost_credits WHERE user_id = uid;

  IF current_balance IS NULL THEN current_balance := 0; END IF;
  IF current_balance < cost THEN
    RAISE EXCEPTION 'Insufficient boost credits (have %, need %)', current_balance, cost
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.boost_credit_ledger (user_id, delta, reason, reference_id, balance_after, metadata)
  VALUES (uid, -cost, 'spend_boost', _track_id::text, current_balance - cost,
          jsonb_build_object('weight', _weight, 'track_id', _track_id))
  RETURNING id INTO new_ledger_id;

  INSERT INTO public.boost_spends (user_id, track_id, weight, credits_cost, ledger_id)
  VALUES (uid, _track_id, _weight, cost, new_ledger_id)
  RETURNING id INTO new_spend_id;

  RETURN QUERY SELECT current_balance - cost, new_spend_id;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_boost_on_track(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.spend_boost_on_track(uuid, integer) TO authenticated;


CREATE OR REPLACE FUNCTION public.grant_boost_credits_purchase(
  _user_id uuid,
  _credits integer,
  _stripe_session_id text,
  _pack_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.boost_credit_ledger
    WHERE reason = 'purchase' AND reference_id = _stripe_session_id
  ) THEN
    SELECT credits INTO new_balance FROM public.play_boost_credits WHERE user_id = _user_id;
    RETURN COALESCE(new_balance, 0);
  END IF;

  PERFORM 1 FROM public.play_boost_credits WHERE user_id = _user_id FOR UPDATE;
  SELECT COALESCE(credits, 0) INTO current_balance
  FROM public.play_boost_credits WHERE user_id = _user_id;
  IF current_balance IS NULL THEN current_balance := 0; END IF;

  new_balance := current_balance + _credits;

  INSERT INTO public.boost_credit_ledger (user_id, delta, reason, reference_id, balance_after, metadata)
  VALUES (_user_id, _credits, 'purchase', _stripe_session_id, new_balance,
          jsonb_build_object('pack_id', _pack_id));

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_boost_credits_purchase(uuid, integer, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_boost_credits_purchase(uuid, integer, text, text) TO service_role;


INSERT INTO public.boost_credit_packs (id, name, credits, price_cents, currency, sort_order)
VALUES
  ('boost_pack_starter', 'Starter Boost Pack', 10,  499,  'usd', 1),
  ('boost_pack_pro',     'Pro Boost Pack',     50,  1999, 'usd', 2),
  ('boost_pack_whale',   'Whale Boost Pack',   250, 7999, 'usd', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents,
  updated_at = now();

DROP TRIGGER IF EXISTS trg_boost_credit_packs_touch ON public.boost_credit_packs;
CREATE TRIGGER trg_boost_credit_packs_touch
BEFORE UPDATE ON public.boost_credit_packs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
