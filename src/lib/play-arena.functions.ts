import { createServerFn } from "@tanstack/react-start";

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
};

const EMPTY: ArenaDashboard = {
  liveBattle: null,
  trendingStream: null,
  queue: [],
  totals: { liveStreams: 0, liveBattles: 0, activeArtists: 0, totalViewers: 0 },
};

export const getArenaDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArenaDashboard> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const [battleRes, streamsRes, queueRes] = await Promise.all([
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
          .select("id, position, artist_name, artist_user_id, status, stream_id")
          .in("status", ["queued", "playing"])
          .order("status", { ascending: true })
          .order("position", { ascending: true })
          .limit(5),
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

      const queue = queueRows.map((r, idx) => ({
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

      return {
        liveBattle,
        trendingStream: trending,
        queue,
        totals: {
          liveStreams: streams.length,
          liveBattles: battle ? 1 : 0,
          activeArtists,
          totalViewers,
        },
      };
    } catch (err) {
      console.error("[getArenaDashboard] failed", err);
      return EMPTY;
    }
  },
);