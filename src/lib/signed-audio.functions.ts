import { createServerFn } from "@tanstack/react-start";

const PATH_RE = /^[A-Za-z0-9_\-./]+$/;
const BUCKET = "artist-audio";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;
const SIGNED_MARKER = `/storage/v1/object/sign/${BUCKET}/`;

function extractPath(input: string): string | null {
  try {
    let i = input.indexOf(MARKER);
    let markerLen = MARKER.length;
    if (i === -1) {
      i = input.indexOf(SIGNED_MARKER);
      markerLen = SIGNED_MARKER.length;
    }
    if (i === -1) return null;
    const tail = input.slice(i + markerLen).split("?")[0];
    if (!PATH_RE.test(tail)) return null;
    return tail;
  } catch {
    return null;
  }
}

/**
 * Mint a short-lived signed URL for a private `artist-audio/` storage object.
 * Accepts a full public URL, an existing signed URL (re-signs from path), or a
 * bare storage path.
 */
export const signAudioUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string; expiresIn?: number }) => data)
  .handler(async ({ data }) => {
    const path = data.url.includes("/storage/")
      ? extractPath(data.url)
      : PATH_RE.test(data.url)
        ? data.url
        : null;
    if (!path) return { url: null as string | null, expiresIn: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expiresIn = Math.min(Math.max(data.expiresIn ?? 3600, 60), 60 * 60 * 24);
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error || !signed?.signedUrl) return { url: null as string | null, expiresIn: 0 };
    return { url: signed.signedUrl, expiresIn };
  });