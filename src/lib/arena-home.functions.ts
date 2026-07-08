// @auth-exempt: public read of homepage battle spotlight.
import { createServerFn } from "@tanstack/react-start";

export type ArenaSpotlight = {
  match: {
    id: string;
    streamId: string;
    roomName: string | null;
    streamTitle: string | null;
    status: string;
    currentRound: number;
    totalRounds: number;
    aWins: number;
    bWins: number;
    aVotes: number;
    bVotes: number;
  } | null;
  artistA: { id: string; name: string; avatarUrl: string | null; wins: number } | null;
  artistB: { id: string; name: string; avatarUrl: string | null; wins: number } | null;
  trending: Array<{
    id: string;
    streamId: string;
    roomName: string | null;
    status: string;
    aName: string;
    bName: string;
    aVotes: number;
    bVotes: number;
  }>;
};

export const getArenaSpotlight = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArenaSpotlight> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // Featured battle: latest live, else latest of any status
    const { data: liveMatch } = await sb
      .from("battle_matches")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: latestMatch } = liveMatch
      ? { data: liveMatch }
      : await sb
          .from("battle_matches")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

    // Trending: last 4 matches
    const { data: trendingRaw } = await sb
      .from("battle_matches")
      .select("id, stream_id, status, artist_a_id, artist_b_id, a_wins, b_wins, a_votes, b_votes, created_at")
      .order("created_at", { ascending: false })
      .limit(6);

    const artistIds = new Set<string>();
    if (latestMatch) {
      if (latestMatch.artist_a_id) artistIds.add(latestMatch.artist_a_id);
      if (latestMatch.artist_b_id) artistIds.add(latestMatch.artist_b_id);
    }
    for (const m of trendingRaw ?? []) {
      if (m.artist_a_id) artistIds.add(m.artist_a_id);
      if (m.artist_b_id) artistIds.add(m.artist_b_id);
    }
    const streamIds = new Set<string>();
    if (latestMatch?.stream_id) streamIds.add(latestMatch.stream_id);
    for (const m of trendingRaw ?? []) if (m.stream_id) streamIds.add(m.stream_id);

    const [profilesRes, streamsRes, winsRes] = await Promise.all([
      artistIds.size
        ? sb.from("profiles").select("id, stage_name, display_name, avatar_url").in("id", Array.from(artistIds))
        : { data: [] },
      streamIds.size
        ? sb.from("streams").select("id, room_name, title").in("id", Array.from(streamIds))
        : { data: [] },
      artistIds.size
        ? sb.from("battle_matches").select("winner_id").in("winner_id", Array.from(artistIds)).eq("status", "complete")
        : { data: [] },
    ]);

    const winsByUser = new Map<string, number>();
    for (const w of winsRes.data ?? []) winsByUser.set(w.winner_id, (winsByUser.get(w.winner_id) ?? 0) + 1);

    // Sign avatar URLs (private bucket)
    const PUBLIC_MARKER = "/storage/v1/object/public/avatars/";
    const PATH_RE = /^[0-9a-fA-F-]{8,}\/.+$/;
    const profiles = new Map<string, any>();
    await Promise.all(
      (profilesRes.data ?? []).map(async (p: any) => {
        const raw: string | null = p.avatar_url ?? null;
        let signed = raw;
        if (raw && raw.includes(PUBLIC_MARKER)) {
          const tail = raw.split(PUBLIC_MARKER)[1]?.split("?")[0] ?? "";
          if (PATH_RE.test(tail)) {
            const { data: s } = await sb.storage.from("avatars").createSignedUrl(tail, 3600);
            if (s?.signedUrl) signed = s.signedUrl;
          }
        }
        profiles.set(p.id, { ...p, avatar_url: signed });
      }),
    );
    const streams = new Map<string, any>((streamsRes.data ?? []).map((s: any) => [s.id, s]));

    const mapArtist = (id: string | null) => {
      if (!id) return null;
      const p = profiles.get(id);
      return {
        id,
        name: p?.stage_name || p?.display_name || "Artist",
        avatarUrl: p?.avatar_url ?? null,
        wins: winsByUser.get(id) ?? 0,
      };
    };

    return {
      match: latestMatch
        ? {
            id: latestMatch.id,
            streamId: latestMatch.stream_id,
            roomName: streams.get(latestMatch.stream_id)?.room_name ?? null,
            streamTitle: streams.get(latestMatch.stream_id)?.title ?? null,
            status: latestMatch.status,
            currentRound: latestMatch.current_round ?? 1,
            totalRounds: latestMatch.total_rounds ?? 3,
            aWins: latestMatch.a_wins ?? 0,
            bWins: latestMatch.b_wins ?? 0,
            aVotes: latestMatch.a_votes ?? 0,
            bVotes: latestMatch.b_votes ?? 0,
          }
        : null,
      artistA: latestMatch ? mapArtist(latestMatch.artist_a_id) : null,
      artistB: latestMatch ? mapArtist(latestMatch.artist_b_id) : null,
      trending: (trendingRaw ?? []).map((m: any) => ({
        id: m.id,
        streamId: m.stream_id,
        roomName: streams.get(m.stream_id)?.room_name ?? null,
        status: m.status,
        aName: profiles.get(m.artist_a_id)?.stage_name || profiles.get(m.artist_a_id)?.display_name || "Artist A",
        bName: profiles.get(m.artist_b_id)?.stage_name || profiles.get(m.artist_b_id)?.display_name || "Artist B",
        aVotes: m.a_votes ?? 0,
        bVotes: m.b_votes ?? 0,
      })),
    };
  },
);