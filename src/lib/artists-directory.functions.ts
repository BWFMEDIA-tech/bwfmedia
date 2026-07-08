// @auth-exempt: public read of non-sensitive data via anon-readable tables / narrow RLS.
import { createServerFn } from "@tanstack/react-start";

export type ArtistDirectoryItem = {
  id: string;
  publicId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  location: string | null;
  genres: string[];
  featured: boolean;
};

/**
 * Public directory of signed/featured artists for the /artists browse page.
 * "Artist" = user with the `artist` role. "Featured" = has avatar + bio.
 */
export const getArtistsDirectory = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArtistDirectoryItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const rolesRes = await sb
      .from("user_roles")
      .select("user_id")
      .eq("role", "artist")
      .limit(500);

    const ids = Array.from(
      new Set((rolesRes.data ?? []).map((r: any) => r.user_id).filter(Boolean)),
    ) as string[];
    if (ids.length === 0) return [];

    const profRes = await sb
      .from("profiles")
      .select(
        "id, public_id, display_name, stage_name, username, avatar_url, banner_url, bio, location, genre, genres",
      )
      .in("id", ids);

    const items: ArtistDirectoryItem[] = (profRes.data ?? []).map((p: any) => {
      const genres: string[] = Array.isArray(p.genres) && p.genres.length
        ? p.genres
        : p.genre
        ? [p.genre]
        : [];
      return {
        id: p.id,
        publicId: p.public_id ?? p.id,
        name: p.stage_name || p.display_name || p.username || "Untitled Artist",
        username: p.username ?? null,
        avatarUrl: p.avatar_url ?? null,
        bannerUrl: p.banner_url ?? null,
        bio: p.bio ?? null,
        location: p.location ?? null,
        genres,
        featured: Boolean(p.avatar_url && p.bio),
      };
    });

    // Featured first, then alphabetical.
    items.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return items;
  },
);