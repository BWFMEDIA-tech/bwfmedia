import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FeedTrack } from "@/lib/home-feed.functions";

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

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function tracksByIds(ids: string[]): Promise<FeedTrack[]> {
  if (!ids.length) return [];
  const sb = await admin();
  const { data } = await sb.from("play_tracks").select(TRACK_COLS).in("id", ids);
  const byId = new Map<string, FeedTrack>((data ?? []).map((r: any) => [r.id, mapTrack(r)]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as FeedTrack[];
}

/* ── Library: likes, saves, follows, recently played ─────────────── */

export type LibrarySummary = {
  liked: FeedTrack[];
  saved: FeedTrack[];
  recentlyPlayed: FeedTrack[];
  followedArtists: { id: string; name: string; avatarUrl: string | null }[];
  savedReleases: { id: string; title: string; artistName: string | null; artworkUrl: string | null }[];
  playlistCount: number;
};

export const getMyLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LibrarySummary> => {
    const uid = context.userId;
    const sb = context.supabase as any;
    const sbA = await admin();

    const [likesRes, savesRes, followsRes, savedRelRes, playlistRes, playedRes] = await Promise.all([
      sb.from("track_likes").select("track_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      sb.from("saved_tracks").select("track_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      sb.from("artist_follows").select("artist_id, created_at").eq("follower_id", uid).order("created_at", { ascending: false }).limit(100),
      sb.from("saved_releases").select("release_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      sb.from("playlists").select("id", { count: "exact", head: true }).eq("user_id", uid),
      sbA
        .from("stream_events")
        .select("track_id, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const recentIds: string[] = [];
    for (const r of (playedRes.data ?? []) as any[]) {
      if (r.track_id && !recentIds.includes(r.track_id)) recentIds.push(r.track_id);
      if (recentIds.length >= 20) break;
    }

    const [liked, saved, recentlyPlayed] = await Promise.all([
      tracksByIds(((likesRes.data ?? []) as any[]).map((r) => r.track_id)),
      tracksByIds(((savesRes.data ?? []) as any[]).map((r) => r.track_id)),
      tracksByIds(recentIds),
    ]);

    const artistIds = ((followsRes.data ?? []) as any[]).map((r) => r.artist_id);
    let followedArtists: LibrarySummary["followedArtists"] = [];
    if (artistIds.length) {
      const { data: profs } = await sbA
        .from("profiles")
        .select("id, display_name, stage_name, username, avatar_url")
        .in("id", artistIds);
      followedArtists = ((profs ?? []) as any[]).map((p) => ({
        id: p.id,
        name: p.stage_name || p.display_name || p.username || "Artist",
        avatarUrl: p.avatar_url ?? null,
      }));
    }

    const releaseIds = ((savedRelRes.data ?? []) as any[]).map((r) => r.release_id);
    let savedReleases: LibrarySummary["savedReleases"] = [];
    if (releaseIds.length) {
      const { data: rel } = await sbA
        .from("distribution_releases")
        .select("id, title, artist_name, artwork_url")
        .in("id", releaseIds);
      savedReleases = ((rel ?? []) as any[]).map((r) => ({
        id: r.id,
        title: r.title,
        artistName: r.artist_name ?? null,
        artworkUrl: r.artwork_url ?? null,
      }));
    }

    return {
      liked,
      saved,
      recentlyPlayed,
      followedArtists,
      savedReleases,
      playlistCount: playlistRes.count ?? 0,
    };
  });

export const toggleSavedTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ trackId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: existing } = await sb
      .from("saved_tracks")
      .select("track_id")
      .eq("user_id", context.userId)
      .eq("track_id", data.trackId)
      .maybeSingle();
    if (existing) {
      const { error } = await sb.from("saved_tracks").delete().eq("user_id", context.userId).eq("track_id", data.trackId);
      if (error) throw error;
      return { saved: false };
    }
    const { error } = await sb.from("saved_tracks").insert({ user_id: context.userId, track_id: data.trackId });
    if (error) throw error;
    return { saved: true };
  });

export const getMySavedTrackIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("saved_tracks")
      .select("track_id")
      .eq("user_id", context.userId);
    return { ids: ((data ?? []) as any[]).map((r) => r.track_id as string) };
  });

export const toggleSavedRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ releaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: existing } = await sb
      .from("saved_releases")
      .select("release_id")
      .eq("user_id", context.userId)
      .eq("release_id", data.releaseId)
      .maybeSingle();
    if (existing) {
      await sb.from("saved_releases").delete().eq("user_id", context.userId).eq("release_id", data.releaseId);
      return { saved: false };
    }
    const { error } = await sb.from("saved_releases").insert({ user_id: context.userId, release_id: data.releaseId });
    if (error) throw error;
    return { saved: true };
  });

/* ── Reactions ───────────────────────────────────────────────────── */

export const setTrackReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ trackId: z.string().uuid(), reaction: z.enum(["like", "fire", "not_for_me"]).nullable() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (data.reaction === null) {
      await sb.from("track_reactions").delete().eq("user_id", context.userId).eq("track_id", data.trackId);
      return { reaction: null };
    }
    const { error } = await sb
      .from("track_reactions")
      .upsert(
        { user_id: context.userId, track_id: data.trackId, reaction: data.reaction, updated_at: new Date().toISOString() },
        { onConflict: "user_id,track_id" },
      );
    if (error) throw error;
    return { reaction: data.reaction };
  });

export const getMyReactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ trackIds: z.array(z.string().uuid()).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.trackIds.length) return { reactions: {} as Record<string, string> };
    const { data: rows } = await (context.supabase as any)
      .from("track_reactions")
      .select("track_id, reaction")
      .eq("user_id", context.userId)
      .in("track_id", data.trackIds);
    const map: Record<string, string> = {};
    for (const r of (rows ?? []) as any[]) map[r.track_id] = r.reaction;
    return { reactions: map };
  });

/* ── Playlists ───────────────────────────────────────────────────── */

export type PlaylistSummary = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  trackCount: number;
  ownerId: string;
  updatedAt: string;
};

async function summarise(rows: any[], sbA: any): Promise<PlaylistSummary[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { data: counts } = await sbA.from("playlist_tracks").select("playlist_id, track_id").in("playlist_id", ids);
  const byPl = new Map<string, number>();
  for (const c of (counts ?? []) as any[]) byPl.set(c.playlist_id, (byPl.get(c.playlist_id) ?? 0) + 1);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    coverUrl: r.cover_url ?? null,
    isPublic: !!r.is_public,
    trackCount: byPl.get(r.id) ?? 0,
    ownerId: r.user_id,
    updatedAt: r.updated_at,
  }));
}

export const listMyPlaylists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sbA = await admin();
    const { data } = await (context.supabase as any)
      .from("playlists")
      .select("id, user_id, title, description, cover_url, is_public, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });

    const { data: follows } = await (context.supabase as any)
      .from("playlist_follows")
      .select("playlist_id")
      .eq("user_id", context.userId);
    const followedIds = ((follows ?? []) as any[]).map((r) => r.playlist_id);
    let followed: PlaylistSummary[] = [];
    if (followedIds.length) {
      const { data: fp } = await sbA
        .from("playlists")
        .select("id, user_id, title, description, cover_url, is_public, updated_at")
        .in("id", followedIds)
        .eq("is_public", true);
      followed = await summarise((fp ?? []) as any[], sbA);
    }
    return { mine: await summarise((data ?? []) as any[], sbA), followed };
  });

export const createPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).optional(),
        isPublic: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("playlists")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description ?? null,
        is_public: data.isPublic,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const updatePlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        playlistId: z.string().uuid(),
        title: z.string().trim().min(1).max(120).optional(),
        description: z.string().trim().max(500).nullable().optional(),
        isPublic: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.isPublic !== undefined) patch.is_public = data.isPublic;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await (context.supabase as any)
      .from("playlists")
      .update(patch)
      .eq("id", data.playlistId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const deletePlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playlistId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("playlists")
      .delete()
      .eq("id", data.playlistId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const addTrackToPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playlistId: z.string().uuid(), trackId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: owner } = await sb
      .from("playlists")
      .select("id")
      .eq("id", data.playlistId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!owner) throw new Error("Playlist not found");

    const { data: existing } = await sb
      .from("playlist_tracks")
      .select("id")
      .eq("playlist_id", data.playlistId)
      .eq("track_id", data.trackId)
      .maybeSingle();
    if (existing) return { added: false, duplicate: true };

    const { data: last } = await sb
      .from("playlist_tracks")
      .select("position")
      .eq("playlist_id", data.playlistId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = ((last?.[0]?.position as number | undefined) ?? -1) + 1;

    const { error } = await sb
      .from("playlist_tracks")
      .insert({ playlist_id: data.playlistId, track_id: data.trackId, position: nextPos });
    if (error) throw error;
    return { added: true, duplicate: false };
  });

export const removeTrackFromPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playlistId: z.string().uuid(), trackId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", data.playlistId)
      .eq("track_id", data.trackId);
    if (error) throw error;
    return { ok: true };
  });

export const reorderPlaylistTracks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ playlistId: z.string().uuid(), trackIds: z.array(z.string().uuid()).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: owner } = await sb
      .from("playlists")
      .select("id")
      .eq("id", data.playlistId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!owner) throw new Error("Playlist not found");
    for (let i = 0; i < data.trackIds.length; i++) {
      await sb
        .from("playlist_tracks")
        .update({ position: i })
        .eq("playlist_id", data.playlistId)
        .eq("track_id", data.trackIds[i]);
    }
    return { ok: true };
  });

export const togglePlaylistFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playlistId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: existing } = await sb
      .from("playlist_follows")
      .select("playlist_id")
      .eq("playlist_id", data.playlistId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      await sb.from("playlist_follows").delete().eq("playlist_id", data.playlistId).eq("user_id", context.userId);
      return { following: false };
    }
    const { error } = await sb.from("playlist_follows").insert({ playlist_id: data.playlistId, user_id: context.userId });
    if (error) throw error;
    return { following: true };
  });

/** Public read of one playlist (owner sees private ones too). */
export const getPlaylist = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ playlistId: z.string().uuid(), viewerId: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    const sbA = await admin();
    const { data: pl } = await sbA
      .from("playlists")
      .select("id, user_id, title, description, cover_url, is_public, updated_at")
      .eq("id", data.playlistId)
      .maybeSingle();
    if (!pl) return { playlist: null, tracks: [] as FeedTrack[], owner: null };
    if (!pl.is_public && pl.user_id !== data.viewerId) {
      return { playlist: null, tracks: [] as FeedTrack[], owner: null, unauthorized: true };
    }
    const { data: pts } = await sbA
      .from("playlist_tracks")
      .select("track_id, position")
      .eq("playlist_id", pl.id)
      .order("position", { ascending: true });
    const tracks = await tracksByIds(((pts ?? []) as any[]).map((r) => r.track_id));
    const { data: owner } = await sbA
      .from("profiles")
      .select("id, display_name, stage_name, username, avatar_url")
      .eq("id", pl.user_id)
      .maybeSingle();
    return {
      playlist: {
        id: pl.id,
        title: pl.title,
        description: pl.description ?? null,
        coverUrl: pl.cover_url ?? null,
        isPublic: !!pl.is_public,
        ownerId: pl.user_id,
        trackCount: tracks.length,
        updatedAt: pl.updated_at,
      } as PlaylistSummary,
      tracks,
      owner: owner
        ? {
            id: owner.id,
            name: owner.stage_name || owner.display_name || owner.username || "Listener",
            avatarUrl: owner.avatar_url ?? null,
          }
        : null,
    };
  });

/* ── For You ─────────────────────────────────────────────────────── */

export type ForYouFeed = {
  hasEnoughActivity: boolean;
  activityCount: number;
  continueListening: FeedTrack[];
  madeForYou: FeedTrack[];
  recommended: FeedTrack[];
  becauseYouListenedTo: { seedArtist: string; tracks: FeedTrack[] } | null;
  newReleases: FeedTrack[];
  hiddenGems: FeedTrack[];
  trending: FeedTrack[];
  risingArtists: { id: string; name: string; avatarUrl: string | null; plays: number }[];
  topGenres: string[];
};

export const getForYou = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ForYouFeed> => {
    const uid = context.userId;
    const sb = context.supabase as any;
    const sbA = await admin();
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [playsRes, likesRes, savesRes, followsRes, reactionsRes] = await Promise.all([
      sbA.from("stream_events").select("track_id, artist_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(300),
      sb.from("track_likes").select("track_id").eq("user_id", uid).limit(300),
      sb.from("saved_tracks").select("track_id").eq("user_id", uid).limit(300),
      sb.from("artist_follows").select("artist_id").eq("follower_id", uid).limit(300),
      sb.from("track_reactions").select("track_id, reaction").eq("user_id", uid).limit(500),
    ]);

    const plays = (playsRes.data ?? []) as any[];
    const likedIds = ((likesRes.data ?? []) as any[]).map((r) => r.track_id as string);
    const savedIds = ((savesRes.data ?? []) as any[]).map((r) => r.track_id as string);
    const followedIds = ((followsRes.data ?? []) as any[]).map((r) => r.artist_id as string);
    const dislikedIds = new Set(
      ((reactionsRes.data ?? []) as any[]).filter((r) => r.reaction === "not_for_me").map((r) => r.track_id as string),
    );

    const activityCount = plays.length + likedIds.length + savedIds.length + followedIds.length;
    const hasEnoughActivity = activityCount >= 5;

    // Affinity: artists the listener plays, likes, saves or follows.
    const affinity = new Map<string, number>();
    for (const p of plays) if (p.artist_id) affinity.set(p.artist_id, (affinity.get(p.artist_id) ?? 0) + 2);
    for (const a of followedIds) affinity.set(a, (affinity.get(a) ?? 0) + 6);

    const seedTrackIds = [...new Set([...likedIds, ...savedIds])].slice(0, 100);
    if (seedTrackIds.length) {
      const { data: seedTracks } = await sbA.from("play_tracks").select("id, artist_user_id").in("id", seedTrackIds);
      for (const t of (seedTracks ?? []) as any[]) {
        if (t.artist_user_id) affinity.set(t.artist_user_id, (affinity.get(t.artist_user_id) ?? 0) + 4);
      }
    }

    const topArtistIds = [...affinity.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 12);
    const playedTrackIds = new Set(plays.map((p) => p.track_id).filter(Boolean));

    const [affinityTracksRes, newRes, trendRes, gemRes, allArtistPlaysRes] = await Promise.all([
      topArtistIds.length
        ? sbA.from("play_tracks").select(TRACK_COLS).in("artist_user_id", topArtistIds).order("score", { ascending: false }).limit(60)
        : Promise.resolve({ data: [] }),
      sbA.from("play_tracks").select(TRACK_COLS).order("created_at", { ascending: false }).limit(20),
      sbA.from("play_tracks").select(TRACK_COLS).gte("created_at", since30).order("score", { ascending: false }).limit(20),
      sbA.from("play_tracks").select(TRACK_COLS).lte("play_count", 250).order("like_count", { ascending: false }).limit(30),
      sbA.from("play_tracks").select("artist_user_id, play_count, created_at").limit(2000),
    ]);

    const filterOut = (t: FeedTrack) => !dislikedIds.has(t.id);
    const affinityTracks = ((affinityTracksRes.data ?? []) as any[]).map(mapTrack).filter(filterOut);

    const madeForYou = affinityTracks.filter((t) => !playedTrackIds.has(t.id)).slice(0, 14);
    const recommended = affinityTracks.filter((t) => !likedIds.includes(t.id)).slice(0, 14);
    const continueListening = (await tracksByIds([...playedTrackIds].slice(0, 14) as string[])).filter(filterOut);

    // Because you listened to <top artist>
    let becauseYouListenedTo: ForYouFeed["becauseYouListenedTo"] = null;
    const seedArtistId = topArtistIds[0];
    if (seedArtistId) {
      const seedTracksForArtist = affinityTracks.filter((t) => t.artistUserId === seedArtistId);
      const seedName = seedTracksForArtist[0]?.artistName;
      const similar = affinityTracks.filter((t) => t.artistUserId !== seedArtistId).slice(0, 14);
      if (seedName && similar.length) becauseYouListenedTo = { seedArtist: seedName, tracks: similar };
    }

    // Rising artists: recent catalog activity, ranked by plays across recent uploads.
    const risingMap = new Map<string, number>();
    for (const r of (allArtistPlaysRes.data ?? []) as any[]) {
      if (!r.artist_user_id || r.created_at < since30) continue;
      risingMap.set(r.artist_user_id, (risingMap.get(r.artist_user_id) ?? 0) + (r.play_count ?? 0));
    }
    const risingIds = [...risingMap.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 14);
    let risingArtists: ForYouFeed["risingArtists"] = [];
    if (risingIds.length) {
      const { data: profs } = await sbA
        .from("profiles")
        .select("id, display_name, stage_name, username, avatar_url")
        .in("id", risingIds);
      risingArtists = risingIds
        .map((id) => {
          const p = ((profs ?? []) as any[]).find((x) => x.id === id);
          if (!p) return null;
          return {
            id,
            name: p.stage_name || p.display_name || p.username || "Artist",
            avatarUrl: p.avatar_url ?? null,
            plays: risingMap.get(id) ?? 0,
          };
        })
        .filter(Boolean) as ForYouFeed["risingArtists"];
    }

    // Top genres from the artists the listener leans on.
    let topGenres: string[] = [];
    if (topArtistIds.length) {
      const { data: profs } = await sbA.from("profiles").select("genre, genres").in("id", topArtistIds);
      const counts = new Map<string, number>();
      for (const p of (profs ?? []) as any[]) {
        const list: string[] = Array.isArray(p.genres) && p.genres.length ? p.genres : p.genre ? [p.genre] : [];
        for (const g of list) counts.set(g, (counts.get(g) ?? 0) + 1);
      }
      topGenres = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 5);
    }

    return {
      hasEnoughActivity,
      activityCount,
      continueListening,
      madeForYou,
      recommended,
      becauseYouListenedTo,
      newReleases: ((newRes.data ?? []) as any[]).map(mapTrack).filter(filterOut),
      hiddenGems: ((gemRes.data ?? []) as any[]).map(mapTrack).filter(filterOut).slice(0, 14),
      trending: ((trendRes.data ?? []) as any[]).map(mapTrack).filter(filterOut),
      risingArtists,
      topGenres,
    };
  });

/* ── Music Match ─────────────────────────────────────────────────── */

export type MusicMatch = {
  hasEnoughData: boolean;
  matches: { id: string; name: string; avatarUrl: string | null; compatibility: number; sharedArtists: string[] }[];
  suggestedArtists: { id: string; name: string; avatarUrl: string | null }[];
  suggestedTracks: FeedTrack[];
  suggestedPlaylists: PlaylistSummary[];
};

export const getMusicMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MusicMatch> => {
    const uid = context.userId;
    const sbA = await admin();

    const { data: myFollows } = await sbA.from("artist_follows").select("artist_id").eq("follower_id", uid);
    const mine = new Set(((myFollows ?? []) as any[]).map((r) => r.artist_id as string));
    if (mine.size < 3) {
      return { hasEnoughData: false, matches: [], suggestedArtists: [], suggestedTracks: [], suggestedPlaylists: [] };
    }

    const { data: peerRows } = await sbA
      .from("artist_follows")
      .select("follower_id, artist_id")
      .in("artist_id", [...mine])
      .limit(5000);

    const peers = new Map<string, Set<string>>();
    for (const r of (peerRows ?? []) as any[]) {
      if (r.follower_id === uid) continue;
      if (!peers.has(r.follower_id)) peers.set(r.follower_id, new Set());
      peers.get(r.follower_id)!.add(r.artist_id);
    }

    const peerIds = [...peers.keys()];
    const peerAll = new Map<string, Set<string>>();
    if (peerIds.length) {
      const { data: allRows } = await sbA
        .from("artist_follows")
        .select("follower_id, artist_id")
        .in("follower_id", peerIds.slice(0, 500))
        .limit(10000);
      for (const r of (allRows ?? []) as any[]) {
        if (!peerAll.has(r.follower_id)) peerAll.set(r.follower_id, new Set());
        peerAll.get(r.follower_id)!.add(r.artist_id);
      }
    }

    const scored = [...peers.entries()]
      .map(([pid, shared]) => {
        const theirs = peerAll.get(pid) ?? shared;
        const union = new Set([...mine, ...theirs]);
        return { pid, shared: [...shared], compatibility: Math.round((shared.size / union.size) * 100), theirs };
      })
      .filter((m) => m.compatibility > 0)
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 12);

    const profileIds = [...new Set([...scored.map((s) => s.pid), ...scored.flatMap((s) => s.shared)])];
    const { data: profs } = profileIds.length
      ? await sbA.from("profiles").select("id, display_name, stage_name, username, avatar_url").in("id", profileIds)
      : { data: [] as any[] };
    const nameOf = (id: string) => {
      const p = ((profs ?? []) as any[]).find((x) => x.id === id);
      return p ? p.stage_name || p.display_name || p.username || "Listener" : "Listener";
    };
    const avatarOf = (id: string) => ((profs ?? []) as any[]).find((x) => x.id === id)?.avatar_url ?? null;

    const matches = scored.map((s) => ({
      id: s.pid,
      name: nameOf(s.pid),
      avatarUrl: avatarOf(s.pid),
      compatibility: s.compatibility,
      sharedArtists: s.shared.slice(0, 3).map(nameOf),
    }));

    // Artists your matches follow that you don't.
    const suggestion = new Map<string, number>();
    for (const s of scored) for (const a of s.theirs) if (!mine.has(a)) suggestion.set(a, (suggestion.get(a) ?? 0) + s.compatibility);
    const suggestedIds = [...suggestion.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 12);
    let suggestedArtists: MusicMatch["suggestedArtists"] = [];
    let suggestedTracks: FeedTrack[] = [];
    if (suggestedIds.length) {
      const { data: sp } = await sbA
        .from("profiles")
        .select("id, display_name, stage_name, username, avatar_url")
        .in("id", suggestedIds);
      suggestedArtists = ((sp ?? []) as any[]).map((p) => ({
        id: p.id,
        name: p.stage_name || p.display_name || p.username || "Artist",
        avatarUrl: p.avatar_url ?? null,
      }));
      const { data: tr } = await sbA
        .from("play_tracks")
        .select(TRACK_COLS)
        .in("artist_user_id", suggestedIds)
        .order("score", { ascending: false })
        .limit(14);
      suggestedTracks = ((tr ?? []) as any[]).map(mapTrack);
    }

    const { data: pls } = await sbA
      .from("playlists")
      .select("id, user_id, title, description, cover_url, is_public, updated_at")
      .eq("is_public", true)
      .in("user_id", matches.length ? matches.map((m) => m.id) : ["00000000-0000-0000-0000-000000000000"])
      .limit(12);
    const suggestedPlaylists = await summarise((pls ?? []) as any[], sbA);

    return { hasEnoughData: true, matches, suggestedArtists, suggestedTracks, suggestedPlaylists };
  });

/* ── Wrapped ─────────────────────────────────────────────────────── */

export type Wrapped = {
  period: "month" | "year";
  hasData: boolean;
  totalMinutes: number;
  totalPlays: number;
  artistsDiscovered: number;
  topArtist: { id: string; name: string; avatarUrl: string | null; plays: number } | null;
  topSong: FeedTrack | null;
  topSongs: FeedTrack[];
  favoriteGenre: string | null;
  arenaVotes: number;
  monthlyTrend: { label: string; minutes: number }[];
};

export const getWrapped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ period: z.enum(["month", "year"]).default("year") }).parse(d))
  .handler(async ({ data, context }): Promise<Wrapped> => {
    const uid = context.userId;
    const sbA = await admin();
    const days = data.period === "month" ? 30 : 365;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [evRes, votesRes] = await Promise.all([
      sbA
        .from("stream_events")
        .select("track_id, artist_id, duration_played_seconds, created_at")
        .eq("user_id", uid)
        .gte("created_at", since)
        .limit(5000),
      sbA.from("battle_votes").select("id", { count: "exact", head: true }).eq("voter_id", uid).gte("created_at", since),
    ]);

    const events = (evRes.data ?? []) as any[];
    if (!events.length) {
      return {
        period: data.period,
        hasData: false,
        totalMinutes: 0,
        totalPlays: 0,
        artistsDiscovered: 0,
        topArtist: null,
        topSong: null,
        topSongs: [],
        favoriteGenre: null,
        arenaVotes: votesRes.count ?? 0,
        monthlyTrend: [],
      };
    }

    const totalSeconds = events.reduce((s, e) => s + (e.duration_played_seconds ?? 0), 0);
    const trackCounts = new Map<string, number>();
    const artistCounts = new Map<string, number>();
    const monthMinutes = new Map<string, number>();
    for (const e of events) {
      if (e.track_id) trackCounts.set(e.track_id, (trackCounts.get(e.track_id) ?? 0) + 1);
      if (e.artist_id) artistCounts.set(e.artist_id, (artistCounts.get(e.artist_id) ?? 0) + 1);
      const label = new Date(e.created_at).toLocaleString("en-US", { month: "short" });
      monthMinutes.set(label, (monthMinutes.get(label) ?? 0) + (e.duration_played_seconds ?? 0) / 60);
    }

    const topTrackIds = [...trackCounts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 10);
    const topSongs = await tracksByIds(topTrackIds);

    const topArtistId = [...artistCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    let topArtist: Wrapped["topArtist"] = null;
    let favoriteGenre: string | null = null;
    if (topArtistId) {
      const { data: p } = await sbA
        .from("profiles")
        .select("id, display_name, stage_name, username, avatar_url, genre, genres")
        .eq("id", topArtistId)
        .maybeSingle();
      if (p) {
        topArtist = {
          id: p.id,
          name: p.stage_name || p.display_name || p.username || "Artist",
          avatarUrl: p.avatar_url ?? null,
          plays: artistCounts.get(topArtistId) ?? 0,
        };
        favoriteGenre = (Array.isArray(p.genres) && p.genres[0]) || p.genre || null;
      }
    }

    return {
      period: data.period,
      hasData: true,
      totalMinutes: Math.round(totalSeconds / 60),
      totalPlays: events.length,
      artistsDiscovered: artistCounts.size,
      topArtist,
      topSong: topSongs[0] ?? null,
      topSongs,
      favoriteGenre,
      arenaVotes: votesRes.count ?? 0,
      monthlyTrend: [...monthMinutes.entries()].map(([label, minutes]) => ({ label, minutes: Math.round(minutes) })),
    };
  });

/* ── Challenges ──────────────────────────────────────────────────── */

export type ChallengeView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardPoints: number;
  completed: boolean;
};

export const getMyChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ challenges: ChallengeView[]; totalPoints: number }> => {
    const uid = context.userId;
    const sbA = await admin();
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [chRes, playsRes, followsRes, plRes, votesRes] = await Promise.all([
      sbA.from("listener_challenges").select("*").eq("active", true).order("sort_order"),
      sbA.from("stream_events").select("artist_id, track_id, created_at").eq("user_id", uid).limit(2000),
      sbA.from("artist_follows").select("artist_id").eq("follower_id", uid),
      sbA.from("playlists").select("id").eq("user_id", uid),
      sbA.from("battle_votes").select("id", { count: "exact", head: true }).eq("voter_id", uid),
    ]);

    const plays = (playsRes.data ?? []) as any[];
    const distinctArtists = new Set(plays.map((p) => p.artist_id).filter(Boolean)).size;

    const playedIds = [...new Set(plays.map((p) => p.track_id).filter(Boolean))] as string[];
    let newReleasePlays = 0;
    if (playedIds.length) {
      const { data: tr } = await sbA.from("play_tracks").select("id, created_at").in("id", playedIds.slice(0, 500));
      newReleasePlays = ((tr ?? []) as any[]).filter((t) => t.created_at >= since30).length;
    }

    const playlistIds = ((plRes.data ?? []) as any[]).map((r) => r.id);
    let playlistTracks = 0;
    if (playlistIds.length) {
      const { count } = await sbA
        .from("playlist_tracks")
        .select("id", { count: "exact", head: true })
        .in("playlist_id", playlistIds);
      playlistTracks = count ?? 0;
    }

    const metrics: Record<string, number> = {
      distinct_artists_played: distinctArtists,
      new_release_plays: newReleasePlays,
      playlist_tracks: playlistTracks,
      artists_followed: (followsRes.data ?? []).length,
      arena_votes: votesRes.count ?? 0,
    };

    const challenges: ChallengeView[] = ((chRes.data ?? []) as any[]).map((c) => {
      const progress = Math.min(metrics[c.metric] ?? 0, c.target);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        target: c.target,
        progress,
        rewardPoints: c.reward_points,
        completed: progress >= c.target,
      };
    });

    return {
      challenges,
      totalPoints: challenges.filter((c) => c.completed).reduce((s, c) => s + c.rewardPoints, 0),
    };
  });

/* ── Exclusive fan content ───────────────────────────────────────── */

export type ExclusivePost = {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar: string | null;
  title: string;
  body: string | null;
  mediaUrl: string | null;
  contentType: string;
  visibility: string;
  publishedAt: string;
};

export const getMyExclusiveFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ posts: ExclusivePost[]; followsCount: number }> => {
    const sb = context.supabase as any;
    const sbA = await admin();
    const { data: follows } = await sb.from("artist_follows").select("artist_id").eq("follower_id", context.userId);
    const followsCount = (follows ?? []).length;

    // RLS on artist_exclusive_content already limits this to public + followed posts.
    const { data: rows } = await sb
      .from("artist_exclusive_content")
      .select("id, artist_id, title, body, media_url, content_type, visibility, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(40);

    const ids = [...new Set(((rows ?? []) as any[]).map((r) => r.artist_id))];
    const { data: profs } = ids.length
      ? await sbA.from("profiles").select("id, display_name, stage_name, username, avatar_url").in("id", ids)
      : { data: [] as any[] };

    const posts = ((rows ?? []) as any[]).map((r) => {
      const p = ((profs ?? []) as any[]).find((x) => x.id === r.artist_id);
      return {
        id: r.id,
        artistId: r.artist_id,
        artistName: p ? p.stage_name || p.display_name || p.username || "Artist" : "Artist",
        artistAvatar: p?.avatar_url ?? null,
        title: r.title,
        body: r.body ?? null,
        mediaUrl: r.media_url ?? null,
        contentType: r.content_type,
        visibility: r.visibility,
        publishedAt: r.published_at,
      };
    });

    return { posts, followsCount };
  });

export const upsertExclusivePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(1).max(160),
        body: z.string().trim().max(4000).optional(),
        mediaUrl: z.string().url().max(1000).optional().nullable(),
        contentType: z.enum(["update", "behind_the_scenes", "early_access", "event", "release"]).default("update"),
        visibility: z.enum(["public", "followers"]).default("followers"),
        publish: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const payload = {
      artist_id: context.userId,
      title: data.title,
      body: data.body ?? null,
      media_url: data.mediaUrl ?? null,
      content_type: data.contentType,
      visibility: data.visibility,
      published_at: data.publish ? new Date().toISOString() : null,
    };
    if (data.id) {
      const { error } = await sb.from("artist_exclusive_content").update(payload).eq("id", data.id).eq("artist_id", context.userId);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("artist_exclusive_content").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row.id as string };
  });

export const deleteExclusivePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("artist_exclusive_content")
      .delete()
      .eq("id", data.id)
      .eq("artist_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listMyExclusivePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("artist_exclusive_content")
      .select("id, title, body, media_url, content_type, visibility, published_at, created_at")
      .eq("artist_id", context.userId)
      .order("created_at", { ascending: false });
    return { posts: (data ?? []) as any[] };
  });
