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
    // Use publishable-key client + a SECURITY DEFINER RPC that returns only
    // safe columns for users with the `artist` role. Avoids the admin/Data-API
    // JWT format mismatch on Lovable Cloud (which returns 0 rows silently).
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await sb.rpc("get_artists_directory");
    if (error) {
      console.error("[getArtistsDirectory] rpc error", error);
      return [];
    }

    const items: ArtistDirectoryItem[] = (data ?? []).map((p: any) => {
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
        location: null,
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