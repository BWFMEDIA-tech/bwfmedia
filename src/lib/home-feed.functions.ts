// @auth-exempt: public read of non-sensitive catalog data for the home dashboard.
import { createServerFn } from "@tanstack/react-start";

export type FeedTrack = {
  id: string;
  title: string;
  artistName: string;
  artistUserId: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  playCount: number;
  likeCount: number;
  score: number;
  createdAt: string;
};

export type FeedArtist = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  genres: string[];
  monthlyListeners: number;
};

export type FeedBattle = {
  id: string;
  streamId: string | null;
  roomName: string | null;
  title: string;
  artistA: string;
  artistB: string;
  currentRound: number;
  totalRounds: number;
  viewers: number;
};

export type FeedStream = {
  id: string;
  title: string;
  roomName: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  viewers: number;
};

export type HomeFeed = {
  trending: FeedTrack[];
  newReleases: FeedTrack[];
  popular: FeedTrack[];
  charts: FeedTrack[];
  discover: FeedTrack[];
  boosted: FeedTrack[];
  featured: FeedTrack | null;
  artists: FeedArtist[];
  rising: FeedArtist[];
  battles: FeedBattle[];
  liveStreams: FeedStream[];
};

const TRACK_COLS =
  "id, title, artist_name, artist_user_id, cover_url, audio_url, duration_seconds, play_count, like_count, score, created_at";

function mapTrack(r: any): FeedTrack {
  return {
    id: r.id,
    title: r.title,
    artistName: r.artist_name ?? "Unknown artist",
    artistUserId: r.artist_user_id ?? null,
    coverUrl: r.cover_url ?? null,
    audioUrl: r.audio_url ?? null,
    durationSeconds: r.duration_seconds ?? null,
    playCount: r.play_count ?? 0,
    likeCount: r.like_count ?? 0,
    score: r.score ?? 0,
    createdAt: r.created_at,
  };
}

export const getHomeFeed = createServerFn({ method: "GET" }).handler(async (): Promise<HomeFeed> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;
  const LIMIT = 14;
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [trendingRes, newRes, popularRes, chartsRes, weekRes, allRes, battleRes, streamRes] =
    await Promise.all([
      sb
        .from("play_tracks")
        .select(TRACK_COLS)
        .gte("created_at", since30)
        .order("score", { ascending: false })
        .limit(LIMIT),
      sb.from("play_tracks").select(TRACK_COLS).order("created_at", { ascending: false }).limit(LIMIT),
      sb.from("play_tracks").select(TRACK_COLS).order("play_count", { ascending: false }).limit(LIMIT),
      sb.from("play_tracks").select(TRACK_COLS).order("score", { ascending: false }).limit(LIMIT),
      sb
        .from("play_tracks")
        .select(TRACK_COLS)
        .gte("created_at", since7)
        .order("play_count", { ascending: false })
        .limit(LIMIT),
      sb.from("play_tracks").select("artist_user_id, play_count").limit(2000),
      sb
        .from("battle_matches")
        .select("id, stream_id, artist_a_name, artist_b_name, current_round, total_rounds, started_at")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(6),
      sb
        .from("streams")
        .select("id, title, room_name, category, thumbnail_url, viewer_count, started_at")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(8),
    ]);

  const trending = (trendingRes.data ?? []).map(mapTrack);
  const newReleases = (newRes.data ?? []).map(mapTrack);
  const popular = (weekRes.data?.length ? weekRes.data : popularRes.data ?? []).map(mapTrack);
  const charts = (chartsRes.data ?? []).map(mapTrack);

  // Discover = catalog shuffled by a stable-ish rotation so it changes over time.
  const pool = [...newReleases, ...popular, ...charts].filter(
    (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i,
  );
  const offset = Math.floor(Date.now() / (1000 * 60 * 30)) % Math.max(pool.length, 1);
  const discover = [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, LIMIT);
  const boosted = [...pool].sort((a, b) => b.likeCount - a.likeCount).slice(0, LIMIT);
  const featured = charts[0] ?? newReleases[0] ?? null;

  // Monthly-listener style figure: total plays across an artist's catalog.
  const playsByArtist = new Map<string, number>();
  for (const r of (allRes.data ?? []) as any[]) {
    if (!r.artist_user_id) continue;
    playsByArtist.set(r.artist_user_id, (playsByArtist.get(r.artist_user_id) ?? 0) + (r.play_count ?? 0));
  }

  let artists: FeedArtist[] = [];
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const pub = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data } = await pub.rpc("get_artists_directory");
    artists = ((data ?? []) as any[]).map((p) => ({
      id: p.id,
      name: p.stage_name || p.display_name || p.username || "Untitled Artist",
      avatarUrl: p.avatar_url ?? null,
      bio: p.bio ?? null,
      genres: Array.isArray(p.genres) && p.genres.length ? p.genres : p.genre ? [p.genre] : [],
      monthlyListeners: playsByArtist.get(p.id) ?? 0,
    }));
  } catch {
    artists = [];
  }

  const sortedArtists = [...artists].sort((a, b) => b.monthlyListeners - a.monthlyListeners);
  const newArtistIds = new Set(
    (newReleases as FeedTrack[]).map((t) => t.artistUserId).filter(Boolean) as string[],
  );
  const rising = artists.filter((a) => newArtistIds.has(a.id)).slice(0, LIMIT);

  const streamRows = (streamRes.data ?? []) as any[];
  const viewersByStream = new Map<string, number>(
    streamRows.map((s) => [s.id, s.viewer_count ?? 0] as [string, number]),
  );
  const battles: FeedBattle[] = ((battleRes.data ?? []) as any[]).map((m) => ({
    id: m.id,
    streamId: m.stream_id ?? null,
    roomName: streamRows.find((s) => s.id === m.stream_id)?.room_name ?? null,
    title: `${m.artist_a_name ?? "Artist A"} vs ${m.artist_b_name ?? "Artist B"}`,
    artistA: m.artist_a_name ?? "Artist A",
    artistB: m.artist_b_name ?? "Artist B",
    currentRound: m.current_round ?? 1,
    totalRounds: m.total_rounds ?? 3,
    viewers: (m.stream_id && viewersByStream.get(m.stream_id)) || 0,
  }));

  const liveStreams: FeedStream[] = streamRows.map((s) => ({
    id: s.id,
    title: s.title ?? "Live now",
    roomName: s.room_name ?? null,
    category: s.category ?? null,
    thumbnailUrl: s.thumbnail_url ?? null,
    viewers: s.viewer_count ?? 0,
  }));

  return {
    trending,
    newReleases,
    popular,
    charts,
    discover,
    boosted,
    featured,
    artists: sortedArtists.slice(0, LIMIT),
    rising: rising.length ? rising : sortedArtists.slice(0, LIMIT),
    battles,
    liveStreams,
  };
});
