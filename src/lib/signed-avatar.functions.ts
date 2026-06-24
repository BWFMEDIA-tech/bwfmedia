import { createServerFn } from "@tanstack/react-start";

const PATH_RE = /^[0-9a-fA-F-]{8,}\/[^/]+$/;

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
    const expiresIn = Math.min(Math.max(data.expiresIn ?? 3600, 60), 60 * 60 * 24);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(path, expiresIn);
    if (error || !signed?.signedUrl) return { url: null as string | null, expiresIn: 0 };
    return { url: signed.signedUrl, expiresIn };
  });