
CREATE TABLE public.play_memberships (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive', -- active | trialing | past_due | canceled | inactive
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.play_memberships TO authenticated;
GRANT ALL ON public.play_memberships TO service_role;

ALTER TABLE public.play_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "play_memberships self select"
  ON public.play_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER play_memberships_touch BEFORE UPDATE ON public.play_memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Grant boost credits (called from webhook after $25 boost purchase).
CREATE OR REPLACE FUNCTION public.grant_play_boost_credits(_user_id uuid, _credits int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_total int;
BEGIN
  INSERT INTO public.play_boost_credits (user_id, credits, updated_at)
  VALUES (_user_id, _credits, now())
  ON CONFLICT (user_id)
  DO UPDATE SET credits = play_boost_credits.credits + EXCLUDED.credits,
                updated_at = now()
  RETURNING credits INTO new_total;
  RETURN new_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_play_boost_credits(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_play_boost_credits(uuid, int) TO service_role;

-- Atomically consume 1 boost credit for the calling user. Returns true if a
-- credit was consumed.
CREATE OR REPLACE FUNCTION public.consume_play_boost_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid; updated int;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN false; END IF;
  UPDATE public.play_boost_credits
     SET credits = credits - 1, updated_at = now()
   WHERE user_id = uid AND credits > 0;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_play_boost_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_play_boost_credit() TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.play_memberships;
