import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ArenaLiveState = {
  match_id: string;
  stream_id: string | null;
  artist_a: string;
  artist_b: string;
  status: string;
  current_round: number;
  total_rounds: number;
  a_wins: number;
  b_wins: number;
  a_votes: number;
  b_votes: number;
  active_side: "a" | "b" | null;
  voting_open: boolean;
  current_round_id: string | null;
  updated_at: string;
};

function buildState(match: any, round: any | null): ArenaLiveState {
  return {
    match_id: match.id,
    stream_id: match.stream_id ?? null,
    artist_a: match.artist_a_name ?? "Artist A",
    artist_b: match.artist_b_name ?? "Artist B",
    status: match.status,
    current_round: match.current_round ?? 0,
    total_rounds: match.total_rounds ?? 3,
    a_wins: match.a_wins ?? 0,
    b_wins: match.b_wins ?? 0,
    a_votes: round?.a_votes ?? 0,
    b_votes: round?.b_votes ?? 0,
    active_side: (match.active_side as "a" | "b" | null) ?? null,
    voting_open: round?.voting_status === "open",
    current_round_id: match.current_round_id ?? null,
    updated_at: round?.updated_at ?? match.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Realtime aggregate state for a Play Arena battle, derived from
 * battle_matches + the current battle_round. Subscribes to row changes on
 * both tables and recomputes whenever either updates.
 */
export function useArenaLive(matchId: string | null) {
  const [state, setState] = useState<ArenaLiveState | null>(null);

  useEffect(() => {
    if (!matchId) {
      setState(null);
      return;
    }

    let match: any = null;
    let round: any = null;
    let cancelled = false;

    const refresh = () => {
      if (cancelled || !match) return;
      setState(buildState(match, round));
    };

    const loadRound = async (roundId: string | null) => {
      if (!roundId) {
        round = null;
        return;
      }
      const { data } = await supabase
        .from("battle_rounds")
        .select("*")
        .eq("id", roundId)
        .maybeSingle();
      round = data;
    };

    (async () => {
      const { data: m } = await supabase
        .from("battle_matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();
      if (cancelled || !m) return;
      match = m;
      await loadRound(m.current_round_id);
      refresh();
    })();

    const channel = supabase
      .channel(`arena_match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "battle_matches",
          filter: `id=eq.${matchId}`,
        },
        async (payload) => {
          match = payload.new ?? match;
          if (match?.current_round_id !== round?.id) {
            await loadRound(match?.current_round_id ?? null);
          }
          refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "battle_rounds",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const next = payload.new as any;
          if (next?.id === match?.current_round_id) {
            round = next;
            refresh();
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  return state;
}