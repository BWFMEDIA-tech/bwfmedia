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
};

/**
 * Public leaderboard of artists ranked by a composite score:
 *   score = xp + battleWins * 500 + totalVotes * 10
 */
export const getArtistLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderboardEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // 1. Artist user IDs
    const rolesRes = await sb
      .from("user_roles")
      .select("user_id")
      .eq("role", "artist")
      .limit(1000);
    const ids = Array.from(
      new Set((rolesRes.data ?? []).map((r: any) => r.user_id).filter(Boolean)),
    ) as string[];
    if (ids.length === 0) return [];

    // 2. Profiles
    const profRes = await sb
      .from("profiles")
      .select("id, public_id, display_name, stage_name, username, avatar_url")
      .in("id", ids);
    const profiles = new Map<string, any>(
      (profRes.data ?? []).map((p: any) => [p.id, p]),
    );

    // 3. XP — latest balance_after per user
    const xpRes = await sb
      .from("xp_ledger")
      .select("user_id, balance_after, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(5000);
    const xpByUser = new Map<string, number>();
    for (const row of xpRes.data ?? []) {
      if (!xpByUser.has(row.user_id)) xpByUser.set(row.user_id, row.balance_after ?? 0);
    }

    // 4. Battle wins
    const winsRes = await sb
      .from("battle_matches")
      .select("winner_id")
      .in("winner_id", ids)
      .eq("status", "complete");
    const winsByUser = new Map<string, number>();
    for (const row of winsRes.data ?? []) {
      winsByUser.set(row.winner_id, (winsByUser.get(row.winner_id) ?? 0) + 1);
    }

    // 5. Tracks + vote totals
    const tracksRes = await sb
      .from("play_tracks")
      .select("artist_user_id, score")
      .in("artist_user_id", ids);
    const trackCountByUser = new Map<string, number>();
    const votesByUser = new Map<string, number>();
    for (const t of tracksRes.data ?? []) {
      trackCountByUser.set(t.artist_user_id, (trackCountByUser.get(t.artist_user_id) ?? 0) + 1);
      votesByUser.set(
        t.artist_user_id,
        (votesByUser.get(t.artist_user_id) ?? 0) + (t.score ?? 0),
      );
    }

    const entries: LeaderboardEntry[] = ids.map((uid) => {
      const p = profiles.get(uid);
      const xp = xpByUser.get(uid) ?? 0;
      const battleWins = winsByUser.get(uid) ?? 0;
      const totalVotes = votesByUser.get(uid) ?? 0;
      const trackCount = trackCountByUser.get(uid) ?? 0;
      return {
        userId: uid,
        publicId: p?.public_id ?? uid,
        name: p?.stage_name || p?.display_name || p?.username || "Artist",
        username: p?.username ?? null,
        avatarUrl: p?.avatar_url ?? null,
        xp,
        battleWins,
        totalVotes,
        trackCount,
        score: xp + battleWins * 500 + totalVotes * 10,
        rank: 0,
      };
    });

    entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    entries.forEach((e, i) => (e.rank = i + 1));
    return entries.slice(0, 100);
  },
);