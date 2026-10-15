// @auth-exempt: public read of non-sensitive data via anon-readable tables / narrow RLS.
import { createServerFn } from "@tanstack/react-start";

export type PlayArenaLive = {
  activeBattles: number;
  viewers: number;
  featured: null | {
    matchId: string;
    streamId: string | null;
    roomName: string | null;
    artistA: string;
    artistB: string;
    aWins: number;
    bWins: number;
    currentRound: number;
    totalRounds: number;
    aVotes: number;
    bVotes: number;
    /** Match-wide cumulative raw votes for Artist A. */
    aTotalVotes: number;
    /** Match-wide cumulative raw votes for Artist B. */
    bTotalVotes: number;
    /** Match-wide weighted display percentage for Artist A. */
    aTotalPct: number;
    /** Match-wide weighted display percentage for Artist B. */
    bTotalPct: number;
    viewers: number;
    startedAt: string | null;
  };
};

export const getPlayArenaLive = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlayArenaLive> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const { data: matches } = await sb
      .from("battle_matches")
      .select(
        "id, stream_id, artist_a_name, artist_b_name, a_wins, b_wins, current_round, total_rounds, current_round_id, started_at",
      )
      .eq("status", "live")
      .order("started_at", { ascending: false });

    const live = (matches ?? []) as any[];
    const activeBattles = live.length;
    const featuredMatch = live[0] ?? null;

    let streamMeta: any = null;
    const streamIds = live.map((m) => m.stream_id).filter(Boolean);
    let featuredStreamViewers = 0;
    if (streamIds.length) {
      const { data: streams } = await sb
        .from("streams")
        .select("id, room_name, viewer_count")
        .in("id", streamIds);
      for (const s of (streams ?? []) as any[]) {
        if (featuredMatch && s.id === featuredMatch.stream_id) {
          streamMeta = s;
          featuredStreamViewers = s.viewer_count ?? 0;
        }
      }
    }

    // True viewers online = users marked online with a recent heartbeat.
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { count: presenceCount } = await sb
      .from("user_presence")
      .select("user_id", { count: "exact", head: true })
      .eq("online", true)
      .gte("last_seen_at", since);
    const viewers = presenceCount ?? 0;

    let aVotes = 0;
    let bVotes = 0;
    if (featuredMatch?.current_round_id) {
      const { data: round } = await sb
        .from("battle_rounds")
        .select("a_votes, b_votes, a_weight, b_weight")
        .eq("id", featuredMatch.current_round_id)
        .maybeSingle();
      aVotes = round?.a_votes ?? 0;
      bVotes = round?.b_votes ?? 0;
    }

    // Derive true round wins from completed battle_rounds instead of trusting the cached column.
    let trueAWins = featuredMatch?.a_wins ?? 0;
    let trueBWins = featuredMatch?.b_wins ?? 0;
    // Cumulative match-wide vote tracking for both artists.
    let aTotalVotes = 0;
    let bTotalVotes = 0;
    let aTotalWeight = 0;
    let bTotalWeight = 0;
    if (featuredMatch?.id) {
      const { data: matchRounds } = await sb
        .from("battle_rounds")
        .select("winner_choice, a_votes, b_votes, a_weight, b_weight")
        .eq("match_id", featuredMatch.id);
      const rows = (matchRounds ?? []) as {
        winner_choice: string | null;
        a_votes: number | null;
        b_votes: number | null;
        a_weight: number | null;
        b_weight: number | null;
      }[];
      trueAWins = rows.filter((r) => r.winner_choice === "a").length;
      trueBWins = rows.filter((r) => r.winner_choice === "b").length;
      for (const r of rows) {
        aTotalVotes += r.a_votes ?? 0;
        bTotalVotes += r.b_votes ?? 0;
        aTotalWeight += r.a_weight ?? 0;
        bTotalWeight += r.b_weight ?? 0;
      }
    }

    // Weighted display percentages, consistent with the arena's vote math.
    const { buildVoteTotals } = await import("@/lib/vote-math");
    const totals = buildVoteTotals({
      a_weight: aTotalWeight,
      b_weight: bTotalWeight,
      a_votes: aTotalVotes,
      b_votes: bTotalVotes,
    });

    return {
      activeBattles,
      viewers,
      featured: featuredMatch
        ? {
            matchId: featuredMatch.id,
            streamId: featuredMatch.stream_id ?? null,
            roomName: streamMeta?.room_name ?? null,
            artistA: featuredMatch.artist_a_name ?? "Artist A",
            artistB: featuredMatch.artist_b_name ?? "Artist B",
            aWins: trueAWins,
            bWins: trueBWins,
            currentRound: featuredMatch.current_round ?? 1,
            totalRounds: featuredMatch.total_rounds ?? 3,
            aVotes,
            bVotes,
            viewers: featuredStreamViewers,
            startedAt: featuredMatch.started_at ?? null,
          }
        : null,
    };
  },
);