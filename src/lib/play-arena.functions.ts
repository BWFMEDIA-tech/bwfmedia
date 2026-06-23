import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ArenaDashboard = {
  liveBattle: {
    id: string;
    artistA: { id: string | null; name: string; avatar: string | null };
    artistB: { id: string | null; name: string; avatar: string | null };
    currentRound: number;
    totalRounds: number;
    aWins: number;
    bWins: number;
    roomName: string | null;
  } | null;
  trendingStream: {
    id: string;
    title: string;
    roomName: string;
    viewerCount: number;
    thumbnail: string | null;
    category: string | null;
  } | null;
  queue: Array<{
    id: string;
    position: number;
    artistName: string;
    artistId: string | null;
    avatar: string | null;
    status: "playing" | "queued";
  }>;
  totals: {
    liveStreams: number;
    liveBattles: number;
    activeArtists: number;
    totalViewers: number;
  };
  nextEventAt: string | null;
  activeEventsCount: number;
  battlesToday: number;
  nextSlotSeconds: number | null;
};

const EMPTY: ArenaDashboard = {
  liveBattle: null,
  trendingStream: null,
  queue: [],
  totals: { liveStreams: 0, liveBattles: 0, activeArtists: 0, totalViewers: 0 },
  nextEventAt: null,
  activeEventsCount: 0,
  battlesToday: 0,
  nextSlotSeconds: null,
};

export const getArenaDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArenaDashboard> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const [battleRes, streamsRes, queueRes, eventsRes, battlesTodayRes] = await Promise.all([
        supabaseAdmin
          .from("battle_matches")
          .select(
            "id, artist_a_id, artist_b_id, artist_a_name, artist_b_name, current_round, total_rounds, a_wins, b_wins, status, stream_id, updated_at",
          )
          .eq("status", "live")
          .order("updated_at", { ascending: false })
          .limit(1),
        supabaseAdmin
          .from("streams")
          .select("id, title, room_name, viewer_count, thumbnail_url, category, status, host_id")
          .eq("status", "live")
          .order("viewer_count", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("play_tracks")
          .select("id, position, artist_name, artist_user_id, status, stream_id, duration_seconds")
          .in("status", ["queued", "playing"])
          .order("status", { ascending: true })
          .order("position", { ascending: true })
          .limit(50),
        supabaseAdmin
          .from("events")
          .select("starts_at, status")
          .in("status", ["scheduled", "live"])
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true }),
        supabaseAdmin
          .from("battle_matches")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfDay.toISOString()),
      ]);

      const battle = battleRes.data?.[0] ?? null;
      const streams = streamsRes.data ?? [];
      const queueRows = queueRes.data ?? [];

      // Collect avatar lookups
      const ids = new Set<string>();
      if (battle?.artist_a_id) ids.add(battle.artist_a_id);
      if (battle?.artist_b_id) ids.add(battle.artist_b_id);
      queueRows.forEach((r) => r.artist_user_id && ids.add(r.artist_user_id));

      let avatars: Record<string, string | null> = {};
      if (ids.size) {
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id, avatar_url")
          .in("id", Array.from(ids));
        avatars = Object.fromEntries((profs ?? []).map((p) => [p.id, p.avatar_url]));
      }

      const trending = streams[0]
        ? {
            id: streams[0].id,
            title: streams[0].title ?? "Live Stream",
            roomName: streams[0].room_name,
            viewerCount: streams[0].viewer_count ?? 0,
            thumbnail: streams[0].thumbnail_url ?? null,
            category: streams[0].category ?? null,
          }
        : null;

      const liveBattle = battle
        ? {
            id: battle.id,
            artistA: {
              id: battle.artist_a_id,
              name: battle.artist_a_name ?? "Artist A",
              avatar: battle.artist_a_id ? avatars[battle.artist_a_id] ?? null : null,
            },
            artistB: {
              id: battle.artist_b_id,
              name: battle.artist_b_name ?? "Artist B",
              avatar: battle.artist_b_id ? avatars[battle.artist_b_id] ?? null : null,
            },
            currentRound: battle.current_round ?? 1,
            totalRounds: battle.total_rounds ?? 3,
            aWins: battle.a_wins ?? 0,
            bWins: battle.b_wins ?? 0,
            roomName:
              streams.find((s) => s.id === battle.stream_id)?.room_name ?? null,
          }
        : null;

      const queueTop = queueRows.slice(0, 5).map((r, idx) => ({
        id: r.id,
        position: r.position ?? idx + 1,
        artistName: r.artist_name ?? "Artist",
        artistId: r.artist_user_id,
        avatar: r.artist_user_id ? avatars[r.artist_user_id] ?? null : null,
        status: (r.status === "playing" ? "playing" : "queued") as "playing" | "queued",
      }));

      const totalViewers = streams.reduce((a, s) => a + (s.viewer_count ?? 0), 0);
      const activeArtists = new Set(
        queueRows.map((r) => r.artist_user_id).filter(Boolean) as string[],
      ).size;

      // Estimate next slot from sum of remaining queue durations (skip the playing one's elapsed time unknown → use full)
      const queuedOnly = queueRows.filter((r) => r.status === "queued");
      const nextSlotSeconds = queuedOnly.length
        ? queuedOnly[0].duration_seconds ?? 180
        : null;

      const events = (eventsRes.data ?? []) as any[];

      return {
        liveBattle,
        trendingStream: trending,
        queue: queueTop,
        totals: {
          liveStreams: streams.length,
          liveBattles: battle ? 1 : 0,
          activeArtists,
          totalViewers,
        },
        nextEventAt: events[0]?.starts_at ?? null,
        activeEventsCount: events.length,
        battlesToday: battlesTodayRes.count ?? 0,
        nextSlotSeconds,
      };
    } catch (err) {
      console.error("[getArenaDashboard] failed", err);
      return EMPTY;
    }
  },
);

/* ---------- User-scoped stats ---------- */

export type ArenaUserStats = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  rank: { name: string; floor: number; cap: number | null };
  nextRank: { name: string; floor: number } | null;
  xpToNext: number;
  progressPct: number;
  queuePosition: number | null;
  battlesToday: number;
};

const RANKS = [
  { name: "Bronze Performer", floor: 0, cap: 2000 },
  { name: "Silver Artist", floor: 2000, cap: 5000 },
  { name: "Gold Creator", floor: 5000, cap: 10000 },
  { name: "Diamond Star", floor: 10000, cap: 25000 },
  { name: "Platinum Icon", floor: 25000, cap: 50000 },
  { name: "Superstar", floor: 50000, cap: 100000 },
  { name: "Legend", floor: 100000, cap: null as number | null },
];

export const getArenaUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ArenaUserStats> => {
    const { supabase, userId } = context;

    const [profileRes, xpRes, queueRes, battlesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, stage_name, username, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("xp_ledger")
        .select("balance_after, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("play_tracks")
        .select("position")
        .eq("artist_user_id", userId)
        .in("status", ["queued", "playing"])
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle(),
      (async () => {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        return supabase
          .from("battle_matches")
          .select("id", { count: "exact", head: true })
          .or(`artist_a_id.eq.${userId},artist_b_id.eq.${userId}`)
          .gte("created_at", start.toISOString());
      })(),
    ]);

    const xp = (xpRes.data as any)?.balance_after ?? 0;
    const rank =
      [...RANKS].reverse().find((r) => xp >= r.floor) ?? RANKS[0];
    const nextIdx = RANKS.findIndex((r) => r.name === rank.name) + 1;
    const nextRank = RANKS[nextIdx] ? { name: RANKS[nextIdx].name, floor: RANKS[nextIdx].floor } : null;
    const xpToNext = nextRank ? Math.max(0, nextRank.floor - xp) : 0;
    const progressPct = rank.cap
      ? Math.min(100, Math.round(((xp - rank.floor) / (rank.cap - rank.floor)) * 100))
      : 100;

    const profile = (profileRes.data as any) ?? null;
    const displayName =
      profile?.stage_name || profile?.display_name || profile?.username || "Artist";

    return {
      userId,
      displayName,
      avatarUrl: profile?.avatar_url ?? null,
      xp,
      rank: { name: rank.name, floor: rank.floor, cap: rank.cap },
      nextRank,
      xpToNext,
      progressPct,
      queuePosition: (queueRes.data as any)?.position ?? null,
      battlesToday: battlesRes.count ?? 0,
    };
  });