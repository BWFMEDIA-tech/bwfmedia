-- Power-ups catalog (publicly readable)
CREATE TABLE public.arena_power_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon text,
  accent text,
  cost_credits integer NOT NULL DEFAULT 0,
  multiplier numeric NOT NULL DEFAULT 1,
  duration_minutes integer NOT NULL DEFAULT 60,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.arena_power_ups TO anon, authenticated;
GRANT ALL ON public.arena_power_ups TO service_role;

ALTER TABLE public.arena_power_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_power_ups_public_read" ON public.arena_power_ups
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "arena_power_ups_admin_manage" ON public.arena_power_ups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_arena_power_ups_updated_at
  BEFORE UPDATE ON public.arena_power_ups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- User activations
CREATE TABLE public.arena_power_up_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  power_up_id uuid NOT NULL REFERENCES public.arena_power_ups(id) ON DELETE CASCADE,
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  credits_spent integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_arena_pu_activations_user_active
  ON public.arena_power_up_activations(user_id, expires_at DESC);

GRANT SELECT, INSERT ON public.arena_power_up_activations TO authenticated;
GRANT ALL ON public.arena_power_up_activations TO service_role;

ALTER TABLE public.arena_power_up_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_pu_activations_self_read" ON public.arena_power_up_activations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "arena_pu_activations_self_insert" ON public.arena_power_up_activations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "arena_pu_activations_admin_all" ON public.arena_power_up_activations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed catalog
INSERT INTO public.arena_power_ups (slug, title, description, icon, accent, cost_credits, multiplier, duration_minutes, sort_order)
VALUES
  ('crowd_surge', 'CROWD SURGE', 'Doubles XP from audience votes.', 'users', '#C53DFF', 50, 2.0, 60, 1),
  ('perfect_set', 'PERFECT SET', 'Bonus XP for no skips.', 'target', '#00E6FF', 40, 1.5, 60, 2),
  ('fast_rise', 'FAST RISE', 'Temporary XP boost for new artists.', 'zap', '#34D399', 30, 1.5, 120, 3),
  ('featured_slot', 'FEATURED SLOT', 'Get featured and gain massive exposure.', 'crown', '#F59E0B', 200, 1.0, 30, 4);

-- Activation RPC: validates credits, deducts, inserts activation row
CREATE OR REPLACE FUNCTION public.activate_power_up(_slug text)
RETURNS TABLE(activation_id uuid, new_balance integer, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  pu  public.arena_power_ups%ROWTYPE;
  current_balance int;
  new_id uuid;
  new_ledger_id uuid;
  exp_at timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO pu FROM public.arena_power_ups WHERE slug = _slug AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Power-up % not found', _slug;
  END IF;

  PERFORM 1 FROM public.play_boost_credits WHERE user_id = uid FOR UPDATE;
  SELECT COALESCE(credits, 0) INTO current_balance FROM public.play_boost_credits WHERE user_id = uid;
  IF current_balance IS NULL THEN current_balance := 0; END IF;

  IF current_balance < pu.cost_credits THEN
    RAISE EXCEPTION 'Insufficient boost credits (have %, need %)', current_balance, pu.cost_credits
      USING ERRCODE = 'P0001';
  END IF;

  IF pu.cost_credits > 0 THEN
    INSERT INTO public.boost_credit_ledger (user_id, delta, reason, reference_id, balance_after, metadata)
    VALUES (uid, -pu.cost_credits, 'power_up', pu.slug, current_balance - pu.cost_credits,
            jsonb_build_object('power_up_id', pu.id, 'slug', pu.slug))
    RETURNING id INTO new_ledger_id;
  END IF;

  exp_at := now() + make_interval(mins => pu.duration_minutes);

  INSERT INTO public.arena_power_up_activations (user_id, power_up_id, expires_at, credits_spent, metadata)
  VALUES (uid, pu.id, exp_at, pu.cost_credits, jsonb_build_object('ledger_id', new_ledger_id))
  RETURNING id INTO new_id;

  RETURN QUERY SELECT new_id, current_balance - pu.cost_credits, exp_at;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_power_up(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_power_up(text) TO authenticated;