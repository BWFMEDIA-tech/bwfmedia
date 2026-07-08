-- ============ Tunevio Arena Hype & Pass system ============
-- battle_reactions: immutable per-user action log — one hype/pass per user
--   per artist per battle, enforced by a UNIQUE constraint (source of truth).
-- battle_scores: live aggregate score engine, one row per (battle, artist).
-- Every score change is broadcast on realtime channel battle:{battle_id}
-- (event 'score_update') and also flows through postgres_changes as a
-- fallback. All writes go through the react_to_battle() SECURITY DEFINER RPC.

CREATE TYPE public.battle_reaction_action AS ENUM ('hype', 'pass');

CREATE TABLE public.battle_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  battle_id uuid NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  action public.battle_reaction_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT battle_reactions_one_per_artist UNIQUE (user_id, battle_id, artist_id)
);

CREATE INDEX battle_reactions_battle_idx
  ON public.battle_reactions (battle_id, created_at DESC);
CREATE INDEX battle_reactions_user_idx
  ON public.battle_reactions (user_id, created_at DESC);

CREATE TABLE public.battle_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  hype_score integer NOT NULL DEFAULT 0,
  pass_score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT battle_scores_battle_artist_key UNIQUE (battle_id, artist_id)
);

ALTER TABLE public.battle_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_scores ENABLE ROW LEVEL SECURITY;

-- Users may read their own reactions (drives the "already reacted" UI state).
CREATE POLICY battle_reactions_select_own ON public.battle_reactions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Aggregate scores are public engagement data.
CREATE POLICY battle_scores_select_all ON public.battle_scores
FOR SELECT TO anon, authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies on either table: the only write path is
-- the react_to_battle() RPC below.

-- Broadcast every score change on channel battle:{battle_id}. Errors from
-- realtime never abort the score write; clients also have the
-- postgres_changes fallback.
CREATE OR REPLACE FUNCTION public.broadcast_battle_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM realtime.send(
      jsonb_build_object(
        'artist_id', NEW.artist_id,
        'hype_score', NEW.hype_score,
        'pass_score', NEW.pass_score,
        'battle_score', NEW.hype_score - NEW.pass_score
      ),
      'score_update',
      'battle:' || NEW.battle_id::text,
      false -- public channel
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;

CREATE TRIGGER battle_scores_broadcast
AFTER INSERT OR UPDATE ON public.battle_scores
FOR EACH ROW EXECUTE FUNCTION public.broadcast_battle_score();

CREATE OR REPLACE FUNCTION public.react_to_battle(
  _battle_id uuid,
  _artist_id uuid,
  _action text,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
  v_hype integer;
  v_pass integer;
  v_existing text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _action NOT IN ('hype', 'pass') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;

  -- The artist must be a participant of a live battle.
  IF NOT EXISTS (
    SELECT 1 FROM public.battle_matches m
    WHERE m.id = _battle_id
      AND m.status = 'live'
      AND _artist_id IN (m.artist_a_id, m.artist_b_id)
  ) THEN
    INSERT INTO public.battle_vote_attempts (match_id, voter_id, outcome, reason, ip, user_agent, metadata)
    VALUES (_battle_id, uid, 'blocked', 'reaction_ineligible_battle', _ip, _user_agent,
            jsonb_build_object('artist_id', _artist_id, 'action', _action));
    RAISE EXCEPTION 'Battle is not live or artist is not part of it' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.battle_reactions (user_id, battle_id, artist_id, action)
  VALUES (uid, _battle_id, _artist_id, _action::public.battle_reaction_action)
  ON CONFLICT (user_id, battle_id, artist_id) DO NOTHING
  RETURNING id INTO new_id;

  IF new_id IS NULL THEN
    -- Duplicate reaction. Clients honoring the cooldown never reach this, so
    -- log it for fraud review and silently return the current scores.
    INSERT INTO public.battle_vote_attempts (match_id, voter_id, outcome, reason, ip, user_agent, metadata)
    VALUES (_battle_id, uid, 'blocked', 'duplicate_reaction', _ip, _user_agent,
            jsonb_build_object('artist_id', _artist_id, 'action', _action));

    SELECT s.hype_score, s.pass_score INTO v_hype, v_pass
    FROM public.battle_scores s
    WHERE s.battle_id = _battle_id AND s.artist_id = _artist_id;

    SELECT r.action::text INTO v_existing
    FROM public.battle_reactions r
    WHERE r.user_id = uid AND r.battle_id = _battle_id AND r.artist_id = _artist_id;

    RETURN jsonb_build_object(
      'duplicate', true,
      'reaction_id', NULL,
      'artist_id', _artist_id,
      'action', v_existing,
      'hype_score', COALESCE(v_hype, 0),
      'pass_score', COALESCE(v_pass, 0),
      'battle_score', COALESCE(v_hype, 0) - COALESCE(v_pass, 0)
    );
  END IF;

  INSERT INTO public.battle_scores (battle_id, artist_id, hype_score, pass_score, updated_at)
  VALUES (
    _battle_id,
    _artist_id,
    CASE WHEN _action = 'hype' THEN 1 ELSE 0 END,
    CASE WHEN _action = 'pass' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (battle_id, artist_id) DO UPDATE
     SET hype_score = battle_scores.hype_score + EXCLUDED.hype_score,
         pass_score = battle_scores.pass_score + EXCLUDED.pass_score,
         updated_at = now()
  RETURNING hype_score, pass_score INTO v_hype, v_pass;

  INSERT INTO public.battle_vote_attempts (match_id, voter_id, outcome, reason, ip, user_agent, metadata)
  VALUES (_battle_id, uid, 'allowed', 'reaction_recorded', _ip, _user_agent,
          jsonb_build_object('artist_id', _artist_id, 'action', _action));

  RETURN jsonb_build_object(
    'duplicate', false,
    'reaction_id', new_id,
    'artist_id', _artist_id,
    'action', _action,
    'hype_score', v_hype,
    'pass_score', v_pass,
    'battle_score', v_hype - v_pass
  );
END $$;

REVOKE ALL ON FUNCTION public.react_to_battle(uuid, uuid, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.react_to_battle(uuid, uuid, text, text, text) TO authenticated, service_role;

-- Realtime fallback: row-level change feed on battle_scores.
ALTER TABLE public.battle_scores REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'battle_scores'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_scores';
  END IF;
END $$;
