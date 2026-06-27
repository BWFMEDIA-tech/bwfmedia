// @auth-exempt: public SEO endpoints reading non-sensitive columns only.
// Uses supabaseAdmin for reads to bypass narrow RLS, but projects ONLY
// safe public columns (no audio_url, no email, no last_seen_at).
import { createServerFn } from "@tanstack/react-start";
import { slugify, trackSlug, trackIdPrefixFromSlug } from "./slugify";

export type SeoArtist = {
  id: string;
  slug: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  genres: string[];
};

export type SeoTrack = {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistUserId: string | null;
  artistSlug: string | null;
  coverUrl: string | null;
  likeCount: number;
  playCount: number;
  createdAt: string;
  genres: string[];
};

function mapProfileToArtist(p: any): SeoArtist {
  const genres: string[] = Array.isArray(p.genres) && p.genres.length
    ? p.genres
    : p.genre ? [p.genre] : [];
  return {
    id: p.id,
    slug: p.username || p.public_id || p.id,
    name: p.stage_name || p.display_name || p.username || "Untitled Artist",
    username: p.username ?? null,
    avatarUrl: p.avatar_url ?? null,
    bannerUrl: p.banner_url ?? null,
    bio: p.bio ?? null,
    genres,
  };
}

function mapTrack(t: any, artistGenres: string[] = []): SeoTrack {
  return {
    id: t.id,
    slug: trackSlug(t.id, t.title),
    title: t.title || "Untitled",
    artistName: t.artist_name || "Unknown Artist",
    artistUserId: t.artist_user_id ?? null,
    artistSlug: t._artist_slug ?? null,
    coverUrl: t.cover_url ?? null,
    likeCount: t.like_count ?? 0,
    playCount: t.play_count ?? 0,
    createdAt: t.created_at,
    genres: artistGenres,
  };
}

async function attachArtistSlugs(sb: any, tracks: any[]): Promise<any[]> {
  const ids = Array.from(new Set(tracks.map((t) => t.artist_user_id).filter(Boolean)));
  if (!ids.length) return tracks;
  const { data } = await sb
    .from("profiles")
    .select("id, username, public_id, genres, genre")
    .in("id", ids);
  const map = new Map<string, any>();
  (data ?? []).forEach((p: any) => map.set(p.id, p));
  return tracks.map((t) => {
    const p = t.artist_user_id ? map.get(t.artist_user_id) : null;
    return { ...t, _artist_slug: p ? (p.username || p.public_id || p.id) : null };
  });
}

/** Resolve an artist by username, public_id, or id. */
export const getArtistForSeo = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<{
    artist: SeoArtist;
    topTracks: SeoTrack[];
    latestTracks: SeoTrack[];
    relatedArtists: SeoArtist[];
  } | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const slug = data.slug.toLowerCase();

    // username lookup first
    let { data: rows } = await sb
      .from("profiles")
      .select("id, public_id, display_name, stage_name, username, avatar_url, banner_url, bio, genre, genres")
      .ilike("username", slug)
      .limit(1);

    if (!rows?.length) {
      // public_id (uuid) or id lookup
      const looksUuid = /^[0-9a-f-]{32,36}$/i.test(slug);
      if (looksUuid) {
        const res = await sb
          .from("profiles")
          .select("id, public_id, display_name, stage_name, username, avatar_url, banner_url, bio, genre, genres")
          .or(`id.eq.${slug},public_id.eq.${slug}`)
          .limit(1);
        rows = res.data ?? [];
      }
    }
    if (!rows?.length) return null;

    const artist = mapProfileToArtist(rows[0]);

    // Tracks for this artist
    const { data: trackRows } = await sb
      .from("play_tracks")
      .select("id, artist_user_id, artist_name, title, cover_url, like_count, play_count, created_at, score")
      .eq("artist_user_id", artist.id)
      .not("audio_url", "is", null)
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .limit(50);
    const withSlugs = await attachArtistSlugs(sb, trackRows ?? []);
    const all = withSlugs.map((t) => mapTrack(t, artist.genres));
    const topTracks = [...all].sort((a, b) => b.likeCount - a.likeCount).slice(0, 10);
    const latestTracks = all.slice(0, 10);

    // Related artists: share at least one genre
    let relatedArtists: SeoArtist[] = [];
    if (artist.genres.length) {
      const { data: rel } = await sb
        .from("profiles")
        .select("id, public_id, display_name, stage_name, username, avatar_url, banner_url, bio, genre, genres")
        .neq("id", artist.id)
        .or(
          artist.genres.map((g) => `genre.eq.${g},genres.cs.{${g}}`).join(",")
        )
        .limit(8);
      relatedArtists = (rel ?? []).map(mapProfileToArtist);
    }

    return { artist, topTracks, latestTracks, relatedArtists };
  });

/** Resolve a track by slug. */
export const getTrackForSeo = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<{
    track: SeoTrack;
    artist: SeoArtist | null;
    relatedTracks: SeoTrack[];
  } | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const prefix = trackIdPrefixFromSlug(data.slug);
    if (!prefix) return null;

    // Build LIKE pattern matching uuids whose first 8 hex chars equal prefix.
    // UUID format: xxxxxxxx-xxxx-... We match `${prefix.slice(0,8)}%`.
    const { data: trackRows } = await sb
      .from("play_tracks")
      .select("id, stream_id, artist_user_id, artist_name, title, cover_url, like_count, play_count, created_at, score, status, audio_url")
      .ilike("id", `${prefix}%`)
      .not("audio_url", "is", null)
      .neq("status", "removed")
      .limit(1);
    if (!trackRows?.length) return null;
    const row = trackRows[0];

    // Artist
    let artist: SeoArtist | null = null;
    if (row.artist_user_id) {
      const { data: aRows } = await sb
        .from("profiles")
        .select("id, public_id, display_name, stage_name, username, avatar_url, banner_url, bio, genre, genres")
        .eq("id", row.artist_user_id)
        .limit(1);
      if (aRows?.length) artist = mapProfileToArtist(aRows[0]);
    }

    // Related: same artist or same first genre
    let related: any[] = [];
    if (row.artist_user_id) {
      const { data: same } = await sb
        .from("play_tracks")
        .select("id, artist_user_id, artist_name, title, cover_url, like_count, play_count, created_at")
        .eq("artist_user_id", row.artist_user_id)
        .neq("id", row.id)
        .not("audio_url", "is", null)
        .neq("status", "removed")
        .order("like_count", { ascending: false })
        .limit(8);
      related = same ?? [];
    }
    related = await attachArtistSlugs(sb, related);

    const trackPayload = mapTrack(
      { ...row, _artist_slug: artist?.slug ?? null },
      artist?.genres ?? [],
    );

    return {
      track: trackPayload,
      artist,
      relatedTracks: related.map((t) => mapTrack(t, artist?.genres ?? [])),
    };
  });

/** Tracks + artists for a genre slug. */
export const getGenreForSeo = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<{
    name: string;
    tracks: SeoTrack[];
    artists: SeoArtist[];
  }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const slug = data.slug.toLowerCase();

    // Find canonical name by scanning distinct profile genres
    const { data: profs } = await sb
      .from("profiles")
      .select("id, public_id, display_name, stage_name, username, avatar_url, banner_url, bio, genre, genres");
    const allArtists = (profs ?? []).map(mapProfileToArtist);
    let canonicalName = slug;
    const matchedArtists = allArtists.filter((a) => {
      for (const g of a.genres) {
        if (slugify(g) === slug) { canonicalName = g; return true; }
      }
      return false;
    });

    // Tracks by those artists
    const ids = matchedArtists.map((a) => a.id);
    let tracks: SeoTrack[] = [];
    if (ids.length) {
      const { data: trackRows } = await sb
        .from("play_tracks")
        .select("id, artist_user_id, artist_name, title, cover_url, like_count, play_count, created_at")
        .in("artist_user_id", ids)
        .not("audio_url", "is", null)
        .neq("status", "removed")
        .order("like_count", { ascending: false })
        .limit(50);
      const withSlugs = await attachArtistSlugs(sb, trackRows ?? []);
      tracks = withSlugs.map((t) => mapTrack(t));
    }

    return { name: canonicalName, tracks, artists: matchedArtists.slice(0, 24) };
  });

export const getTrendingForSeo = createServerFn({ method: "GET" }).handler(
  async (): Promise<SeoTrack[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data } = await sb
      .from("play_tracks")
      .select("id, artist_user_id, artist_name, title, cover_url, like_count, play_count, created_at, score")
      .not("audio_url", "is", null)
      .neq("status", "removed")
      .order("score", { ascending: false })
      .order("like_count", { ascending: false })
      .limit(50);
    const withSlugs = await attachArtistSlugs(sb, data ?? []);
    return withSlugs.map((t) => mapTrack(t));
  },
);

export const getChartsForSeo = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ tracks: SeoTrack[]; artists: SeoArtist[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data: trackRows } = await sb
      .from("play_tracks")
      .select("id, artist_user_id, artist_name, title, cover_url, like_count, play_count, created_at, score")
      .not("audio_url", "is", null)
      .neq("status", "removed")
      .order("play_count", { ascending: false })
      .limit(100);
    const withSlugs = await attachArtistSlugs(sb, trackRows ?? []);
    const tracks = withSlugs.map((t) => mapTrack(t));

    // Top artists by aggregated play count
    const counts = new Map<string, { count: number }>();
    tracks.forEach((t) => {
      if (!t.artistUserId) return;
      const prev = counts.get(t.artistUserId) ?? { count: 0 };
      counts.set(t.artistUserId, { count: prev.count + (t.playCount || 0) });
    });
    const topIds = Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([id]) => id);
    let artists: SeoArtist[] = [];
    if (topIds.length) {
      const { data: profs } = await sb
        .from("profiles")
        .select("id, public_id, display_name, stage_name, username, avatar_url, banner_url, bio, genre, genres")
        .in("id", topIds);
      artists = (profs ?? []).map(mapProfileToArtist);
    }
    return { tracks, artists };
  },
);

/** Lightweight listings for sitemap generation. */
export const listForSitemap = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    artists: Array<{ slug: string; updatedAt: string | null }>;
    tracks: Array<{ slug: string; updatedAt: string | null }>;
    genres: string[];
  }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // Artists: those with username OR role=artist
    const { data: artistRoles } = await sb
      .from("user_roles")
      .select("user_id")
      .eq("role", "artist")
      .limit(2000);
    const artistIds = Array.from(new Set((artistRoles ?? []).map((r: any) => r.user_id)));
    const { data: profs } = artistIds.length
      ? await sb
          .from("profiles")
          .select("id, public_id, username, updated_at, genre, genres")
          .in("id", artistIds)
      : { data: [] };
    const artists = (profs ?? []).map((p: any) => ({
      slug: p.username || p.public_id || p.id,
      updatedAt: p.updated_at ?? null,
    }));
    const genreSet = new Set<string>();
    (profs ?? []).forEach((p: any) => {
      if (p.genre) genreSet.add(slugify(p.genre));
      if (Array.isArray(p.genres)) p.genres.forEach((g: string) => genreSet.add(slugify(g)));
    });

    const { data: trackRows } = await sb
      .from("play_tracks")
      .select("id, title, updated_at")
      .not("audio_url", "is", null)
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .limit(5000);
    const tracks = (trackRows ?? []).map((t: any) => ({
      slug: trackSlug(t.id, t.title),
      updatedAt: t.updated_at ?? null,
    }));

    return {
      artists,
      tracks,
      genres: Array.from(genreSet).filter(Boolean),
    };
  },
);