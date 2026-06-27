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

    let viewers = 0;
    let streamMeta: any = null;
    const streamIds = live.map((m) => m.stream_id).filter(Boolean);
    if (streamIds.length) {
      const { data: streams } = await sb
        .from("streams")
        .select("id, room_name, viewer_count")
        .in("id", streamIds);
      for (const s of (streams ?? []) as any[]) {
        viewers += s.viewer_count ?? 0;
        if (featuredMatch && s.id === featuredMatch.stream_id) streamMeta = s;
      }
    }

    let aVotes = 0;
    let bVotes = 0;
    if (featuredMatch?.current_round_id) {
      const { data: round } = await sb
        .from("battle_rounds")
        .select("a_votes, b_votes")
        .eq("id", featuredMatch.current_round_id)
        .maybeSingle();
      aVotes = round?.a_votes ?? 0;
      bVotes = round?.b_votes ?? 0;
    }

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
            aWins: featuredMatch.a_wins ?? 0,
            bWins: featuredMatch.b_wins ?? 0,
            currentRound: featuredMatch.current_round ?? 1,
            totalRounds: featuredMatch.total_rounds ?? 3,
            aVotes,
            bVotes,
            viewers: streamMeta?.viewer_count ?? 0,
            startedAt: featuredMatch.started_at ?? null,
          }
        : null,
    };
  },
);