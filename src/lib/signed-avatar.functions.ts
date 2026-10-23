// @auth-exempt: returns short-lived signed URLs for public-readable avatar paths only.
import { createServerFn } from "@tanstack/react-start";

const PATH_RE = /^[0-9a-fA-F-]{8,}\/.+$/;

/** Keep only paths that are a profile's current avatar (the public-readable set). */
async function publicAvatarPaths(admin: any, paths: string[]): Promise<Set<string>> {
  const allowed = new Set<string>();
  if (!paths.length) return allowed;
  const owners = [...new Set(paths.map((p) => p.split("/")[0]))].filter((o) => /^[0-9a-fA-F-]{36}$/.test(o));
  if (!owners.length) return allowed;
  const { data } = await admin.from("profiles").select("avatar_url").in("id", owners.slice(0, 500));
  const refs = (data ?? []).map((r: any) => String(r.avatar_url ?? ""));
  for (const p of paths) if (refs.some((ref: string) => ref === p || ref.split("?")[0].endsWith(`/avatars/${p}`))) allowed.add(p);
  return allowed;
}

function extractAvatarPath(input: string): string | null {
  try {
    const marker = "/storage/v1/object/public/avatars/";
    const i = input.indexOf(marker);
    if (i === -1) return null;
    const tail = input.slice(i + marker.length).split("?")[0];
    if (!PATH_RE.test(tail)) return null;
    return tail;
  } catch {
    return null;
  }
}

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
    const path = data.url.includes("/")
      ? (extractAvatarPath(data.url) ?? (PATH_RE.test(data.url) ? data.url : null))
      : null;
    if (!path) return { url: null as string | null, expiresIn: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!(await publicAvatarPaths(supabaseAdmin, [path])).has(path)) return { url: null as string | null, expiresIn: 0 };
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
      const path = u.includes("/")
        ? (extractAvatarPath(u) ?? (PATH_RE.test(u) ? u : null))
        : null;
      if (!path) {
        out[u] = null;
        continue;
      }
      pathMap.set(path, u);
    }
    if (pathMap.size === 0) return { results: out, expiresIn };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allowed = await publicAvatarPaths(supabaseAdmin, Array.from(pathMap.keys()).slice(0, 500));
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