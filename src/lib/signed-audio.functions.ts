import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { url: string; expiresIn?: number }) => data)
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const path = data.url.includes("/storage/")
      ? extractPath(data.url)
      : PATH_RE.test(data.url)
        ? data.url
        : null;
    if (!path) return { url: null as string | null, expiresIn: 0 };

    // Authorization: allow if (a) caller owns the path under play/<userId>/,
    // (b) caller is an admin, or (c) path is referenced by a published
    // play_tracks row (queued/playing) so listeners can stream it.
    const ownsPath = path.startsWith(`play/${userId}/`);
    let authorized = ownsPath;

    if (!authorized) {
      const { data: adminCheck } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (adminCheck === true) authorized = true;
    }

    if (!authorized) {
      // Look up a published track whose audio_url contains this path.
      const { data: track } = await supabase
        .from("play_tracks")
        .select("id")
        .in("status", ["queued", "playing"])
        .ilike("audio_url", `%${path}%`)
        .limit(1)
        .maybeSingle();
      if (track?.id) authorized = true;
    }

    if (!authorized) {
      return { url: null as string | null, expiresIn: 0 };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cap signed URL lifetime to 10 minutes for listener access.
    const expiresIn = Math.min(Math.max(data.expiresIn ?? 600, 60), 60 * 10);
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error || !signed?.signedUrl) return { url: null as string | null, expiresIn: 0 };
    return { url: signed.signedUrl, expiresIn };
  });