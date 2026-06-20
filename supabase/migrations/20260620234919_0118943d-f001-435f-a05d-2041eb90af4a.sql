
-- =========================================================
-- PLAY ARENA BACKEND CORE (additive)
-- =========================================================

-- 1) MATCHMAKING POOL ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matchmaking_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'bronze',
  xp_snapshot integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  matched_battle_id uuid REFERENCES public.battle_matches(id) ON DELETE SET NULL,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matchmaking_pool_status_check CHECK (status IN ('waiting','matched','cancelled','expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS matchmaking_pool_one_active_per_user
  ON public.matchmaking_pool (user_id) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_matchmaking_pool_tier_waiting
  ON public.matchmaking_pool (tier, enqueued_at) WHERE status = 'waiting';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matchmaking_pool TO authenticated;
GRANT ALL ON public.matchmaking_pool TO service_role;
ALTER TABLE public.matchmaking_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mm_pool_select_all_auth" ON public.matchmaking_pool
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "mm_pool_insert_self" ON public.matchmaking_pool
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'waiting');
CREATE POLICY "mm_pool_update_self_or_admin" ON public.matchmaking_pool
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mm_pool_delete_self_or_admin" ON public.matchmaking_pool
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER matchmaking_pool_touch BEFORE UPDATE ON public.matchmaking_pool
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- 2) ARENA PLAYBACK STATE -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arena_playback_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL UNIQUE REFERENCES public.streams(id) ON DELETE CASCADE,
  current_track_id uuid REFERENCES public.play_tracks(id) ON DELETE SET NULL,
  position_seconds numeric NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arena_playback_state_stream ON public.arena_playback_state(stream_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.arena_playback_state TO authenticated;
GRANT SELECT ON public.arena_playback_state TO anon;
GRANT ALL ON public.arena_playback_state TO service_role;
ALTER TABLE public.arena_playback_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playback_state_select_all" ON public.arena_playback_state
  FOR SELECT USING (true);
CREATE POLICY "playback_state_host_insert" ON public.arena_playback_state
  FOR INSERT TO authenticated
  WITH CHECK (public.is_stream_host(auth.uid(), stream_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "playback_state_host_update" ON public.arena_playback_state
  FOR UPDATE TO authenticated
  USING (public.is_stream_host(auth.uid(), stream_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_stream_host(auth.uid(), stream_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "playback_state_host_delete" ON public.arena_playback_state
  FOR DELETE TO authenticated
  USING (public.is_stream_host(auth.uid(), stream_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER arena_playback_state_touch BEFORE UPDATE ON public.arena_playback_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- 3) XP LEDGER (append-only) --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  reference_id text,
  balance_after integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT xp_ledger_reason_check CHECK (reason IN (
    'battle_win','battle_loss','vote_received','vote_cast',
    'daily_login','admin_grant','admin_revoke','bonus'
  ))
);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_created ON public.xp_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS xp_ledger_dedupe_ref
  ON public.xp_ledger(user_id, reason, reference_id)
  WHERE reference_id IS NOT NULL;

GRANT SELECT ON public.xp_ledger TO authenticated;
GRANT ALL ON public.xp_ledger TO service_role;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_ledger_select_self_or_admin" ON public.xp_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
-- No INSERT/UPDATE/DELETE policy => clients cannot write. Writes go through SECURITY DEFINER functions.

CREATE OR REPLACE FUNCTION public.xp_ledger_block_mutations()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'xp_ledger is append-only and managed by award_xp()';
END $$;
CREATE TRIGGER xp_ledger_no_update BEFORE UPDATE ON public.xp_ledger
  FOR EACH ROW EXECUTE FUNCTION public.xp_ledger_block_mutations();
CREATE TRIGGER xp_ledger_no_delete BEFORE DELETE ON public.xp_ledger
  FOR EACH ROW EXECUTE FUNCTION public.xp_ledger_block_mutations();


-- 4) ARENA EVENTS (telemetry) -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arena_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE,
  battle_id uuid REFERENCES public.battle_matches(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arena_events_type_check CHECK (event_type IN (
    'vote_update','queue_update','battle_started','battle_ended',
    'match_found','playback_sync','xp_update','room_created','room_ended'
  ))
);
CREATE INDEX IF NOT EXISTS idx_arena_events_stream_created ON public.arena_events(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_events_type_created ON public.arena_events(event_type, created_at DESC);

GRANT SELECT ON public.arena_events TO authenticated;
GRANT ALL ON public.arena_events TO service_role;
ALTER TABLE public.arena_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_events_admin_select" ON public.arena_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));


-- 5) REVENUE EVENTS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  reference_id text,
  stream_id uuid REFERENCES public.streams(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revenue_events_source_check CHECK (source IN (
    'tip','boost','subscription','merch','payout','refund'
  ))
);
CREATE INDEX IF NOT EXISTS idx_revenue_events_user_created ON public.revenue_events(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS revenue_events_dedupe_ref
  ON public.revenue_events(source, reference_id) WHERE reference_id IS NOT NULL;

GRANT SELECT ON public.revenue_events TO authenticated;
GRANT ALL ON public.revenue_events TO service_role;
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_events_select_self_or_admin" ON public.revenue_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));


-- 6) FUNCTIONS ----------------------------------------------------------------

-- Award XP (secure writer)
CREATE OR REPLACE FUNCTION public.award_xp(
  _user_id uuid, _delta integer, _reason text, _reference_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_balance int; new_balance int;
BEGIN
  IF _user_id IS NULL OR _delta IS NULL OR _reason IS NULL THEN
    RAISE EXCEPTION 'award_xp: missing args';
  END IF;

  -- Idempotency: if reference_id supplied and already recorded, return current balance
  IF _reference_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.xp_ledger
    WHERE user_id = _user_id AND reason = _reason AND reference_id = _reference_id
  ) THEN
    SELECT COALESCE(SUM(delta),0) INTO current_balance FROM public.xp_ledger WHERE user_id = _user_id;
    RETURN current_balance;
  END IF;

  SELECT COALESCE(SUM(delta),0) INTO current_balance FROM public.xp_ledger WHERE user_id = _user_id;
  new_balance := current_balance + _delta;

  INSERT INTO public.xp_ledger(user_id, delta, reason, reference_id, balance_after, metadata)
  VALUES (_user_id, _delta, _reason, _reference_id, new_balance, COALESCE(_metadata,'{}'::jsonb));

  RETURN new_balance;
END $$;
REVOKE ALL ON FUNCTION public.award_xp(uuid,integer,text,text,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid,integer,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_xp(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta),0)::int FROM public.xp_ledger WHERE user_id = _user_id
$$;
GRANT EXECUTE ON FUNCTION public.get_user_xp(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_user_rank(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE xp int;
BEGIN
  xp := public.get_user_xp(_user_id);
  RETURN CASE
    WHEN xp >= 25000 THEN 'Legend'
    WHEN xp >= 10000 THEN 'Diamond'
    WHEN xp >=  5000 THEN 'Platinum'
    WHEN xp >=  2000 THEN 'Gold'
    WHEN xp >=   500 THEN 'Silver'
    ELSE 'Bronze'
  END;
END $$;
GRANT EXECUTE ON FUNCTION public.get_user_rank(uuid) TO authenticated, service_role;

-- Matchmaking enqueue/dequeue
CREATE OR REPLACE FUNCTION public.enqueue_matchmaking(_tier text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); xp int; tier text; new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  xp := public.get_user_xp(uid);
  tier := COALESCE(_tier, lower(public.get_user_rank(uid)));

  INSERT INTO public.matchmaking_pool(user_id, tier, xp_snapshot, status)
  VALUES (uid, tier, xp, 'waiting')
  ON CONFLICT (user_id) WHERE status = 'waiting'
  DO UPDATE SET tier = EXCLUDED.tier, xp_snapshot = EXCLUDED.xp_snapshot, updated_at = now()
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.enqueue_matchmaking(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dequeue_matchmaking()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); n int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  UPDATE public.matchmaking_pool SET status='cancelled', updated_at=now()
  WHERE user_id = uid AND status='waiting';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
GRANT EXECUTE ON FUNCTION public.dequeue_matchmaking() TO authenticated;


-- 7) REALTIME PUBLICATION -----------------------------------------------------
DO $$
BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_pool; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_playback_state; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_ledger; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE public.matchmaking_pool REPLICA IDENTITY FULL;
ALTER TABLE public.arena_playback_state REPLICA IDENTITY FULL;
