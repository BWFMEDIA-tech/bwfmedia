// @auth-exempt: public read of non-sensitive data via anon-readable tables / narrow RLS.
import { createServerFn } from "@tanstack/react-start";

export type LeaderboardEntry = {
  userId: string;
  publicId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  xp: number;
  battleWins: number;
  totalVotes: number;
  trackCount: number;
  score: number;
  rank: number;
  totalBattles: number;
  losses: number;
  winRate: number;
  streamSeconds: number;
};

/**
 * Public leaderboard sourced from the live `arena_leaderboard` view.
 * XP = wins*3 + votes*0.5 + streamSeconds*0.1
 * Ranked by XP, win rate, wins, votes.
 */
export const getArtistLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderboardEntry[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await sb
      .from("arena_leaderboard")
      .select(
        "user_id, public_id, name, username, avatar_url, total_battles, wins, losses, win_rate, total_votes, total_stream_seconds, xp, rank",
      )
      .order("rank", { ascending: true })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      userId: r.user_id,
      publicId: r.public_id ?? r.user_id,
      name: r.name ?? "Artist",
      username: r.username ?? null,
      avatarUrl: r.avatar_url ?? null,
      xp: Math.round(Number(r.xp ?? 0)),
      battleWins: r.wins ?? 0,
      totalVotes: r.total_votes ?? 0,
      trackCount: 0,
      score: Math.round(Number(r.xp ?? 0)),
      rank: r.rank ?? 0,
      totalBattles: r.total_battles ?? 0,
      losses: r.losses ?? 0,
      winRate: Number(r.win_rate ?? 0),
      streamSeconds: Number(r.total_stream_seconds ?? 0),
    }));
  },
);