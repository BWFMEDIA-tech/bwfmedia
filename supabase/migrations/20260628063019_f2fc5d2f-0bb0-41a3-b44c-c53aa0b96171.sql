
-- Live arena leaderboard view: aggregates battle stats, votes received, and stream time per artist.
CREATE OR REPLACE VIEW public.arena_leaderboard AS
WITH artist_ids AS (
  SELECT user_id AS id FROM public.user_roles WHERE role = 'artist'
),
match_stats AS (
  SELECT
    a.id AS artist_id,
    COUNT(m.id) FILTER (WHERE m.status = 'complete') AS total_battles,
    COUNT(m.id) FILTER (WHERE m.status = 'complete' AND m.winner_id = a.id) AS wins,
    COUNT(m.id) FILTER (
      WHERE m.status = 'complete'
        AND m.winner_id IS NOT NULL
        AND m.winner_id <> a.id
        AND (m.artist_a_id = a.id OR m.artist_b_id = a.id)
    ) AS losses
  FROM artist_ids a
  LEFT JOIN public.battle_matches m
    ON (m.artist_a_id = a.id OR m.artist_b_id = a.id)
  GROUP BY a.id
),
vote_stats AS (
  SELECT
    a.id AS artist_id,
    COALESCE(SUM(
      CASE
        WHEN m.artist_a_id = a.id THEN COALESCE(r.a_votes, 0)
        WHEN m.artist_b_id = a.id THEN COALESCE(r.b_votes, 0)
        ELSE 0
      END
    ), 0)::int AS total_votes
  FROM artist_ids a
  LEFT JOIN public.battle_matches m
    ON (m.artist_a_id = a.id OR m.artist_b_id = a.id)
  LEFT JOIN public.battle_rounds r ON r.match_id = m.id
  GROUP BY a.id
),
stream_time AS (
  SELECT
    a.id AS artist_id,
    COALESCE(SUM(
      GREATEST(0, EXTRACT(EPOCH FROM (
        COALESCE(sp.last_seen_at, sp.joined_at) - sp.joined_at
      )))
    ), 0)::bigint AS stream_seconds
  FROM artist_ids a
  LEFT JOIN public.stage_participants sp ON sp.user_id = a.id
  GROUP BY a.id
),
combined AS (
  SELECT
    a.id AS user_id,
    p.public_id,
    COALESCE(p.stage_name, p.display_name, p.username, 'Artist') AS name,
    p.username,
    p.avatar_url,
    COALESCE(ms.total_battles, 0) AS total_battles,
    COALESCE(ms.wins, 0) AS wins,
    COALESCE(ms.losses, 0) AS losses,
    CASE WHEN COALESCE(ms.total_battles,0) > 0
      THEN ROUND((ms.wins::numeric / ms.total_battles::numeric) * 100, 2)
      ELSE 0 END AS win_rate,
    COALESCE(vs.total_votes, 0) AS total_votes,
    COALESCE(st.stream_seconds, 0) AS total_stream_seconds,
    (COALESCE(ms.wins,0) * 3
     + COALESCE(vs.total_votes,0) * 0.5
     + COALESCE(st.stream_seconds,0) * 0.1)::numeric AS xp
  FROM artist_ids a
  LEFT JOIN public.profiles p ON p.id = a.id
  LEFT JOIN match_stats ms ON ms.artist_id = a.id
  LEFT JOIN vote_stats vs ON vs.artist_id = a.id
  LEFT JOIN stream_time st ON st.artist_id = a.id
)
SELECT
  user_id, public_id, name, username, avatar_url,
  total_battles, wins, losses, win_rate, total_votes, total_stream_seconds, xp,
  ROW_NUMBER() OVER (
    ORDER BY xp DESC, win_rate DESC, wins DESC, total_votes DESC, name ASC
  )::int AS rank
FROM combined;

GRANT SELECT ON public.arena_leaderboard TO anon, authenticated;
GRANT ALL ON public.arena_leaderboard TO service_role;

-- Make sure realtime fires for the underlying tables.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_matches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rounds; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_votes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.streams; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
