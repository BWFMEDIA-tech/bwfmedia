// @auth-exempt: returns short-lived signed URLs for public-readable avatar paths only.
import { createServerFn } from "@tanstack/react-start";
import { avatarObjectPath, publicArtworkPaths } from "./public-artwork";

/**
 * Mint a short-lived signed URL for a private `avatars/` storage object.
 * Accepts either the bare storage path (e.g. "<uid>/avatar.png") or a full
 * public-URL string (`/storage/v1/object/public/avatars/...`) so existing
 * `profiles.avatar_url` rows work without a migration.
 * Public endpoint — avatars are intended to be broadly visible.
 */
export const signAvatarUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string; expiresIn?: number }) => data)
  .handler(async ({ data }) => {
    const path = avatarObjectPath(data.url);
    if (!path) return { url: null as string | null, expiresIn: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!(await publicArtworkPaths(supabaseAdmin, [path])).has(path)) return { url: null as string | null, expiresIn: 0 };
    const expiresIn = Math.min(Math.max(data.expiresIn ?? 3600, 60), 60 * 60 * 24);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(path, expiresIn);
    if (error || !signed?.signedUrl) return { url: null as string | null, expiresIn: 0 };
    return { url: signed.signedUrl, expiresIn };
  });

/**
 * Batch sign many avatar URLs in a single round-trip. Returns a map of
 * originalUrl -> signedUrl (or null when un-signable).
 */
export const signAvatarUrls = createServerFn({ method: "POST" })
  .inputValidator((data: { urls: string[]; expiresIn?: number }) => data)
  .handler(async ({ data }) => {
    const expiresIn = Math.min(Math.max(data.expiresIn ?? 3600, 60), 60 * 60 * 24);
    const out: Record<string, string | null> = {};
    const pathMap = new Map<string, string>(); // path -> originalUrl
    for (const u of data.urls) {
      if (!u || typeof u !== "string") continue;
      const path = avatarObjectPath(u);
      if (!path) {
        out[u] = null;
        continue;
      }
      pathMap.set(path, u);
    }
    if (pathMap.size === 0) return { results: out, expiresIn };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allowed = await publicArtworkPaths(supabaseAdmin, Array.from(pathMap.keys()).slice(0, 500));
    for (const [p, original] of pathMap) if (!allowed.has(p)) { out[original] = null; pathMap.delete(p); }
    if (pathMap.size === 0) return { results: out, expiresIn };
    const paths = Array.from(pathMap.keys());
    const { data: signed, error } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrls(paths, expiresIn);
    if (error || !signed) {
      for (const original of pathMap.values()) out[original] = null;
      return { results: out, expiresIn };
    }
    for (const item of signed) {
      const original = pathMap.get(item.path ?? "");
      if (!original) continue;
      out[original] = item.signedUrl ?? null;
    }
    return { results: out, expiresIn };
  });