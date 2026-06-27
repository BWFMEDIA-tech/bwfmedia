import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

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
    // Capture request metadata for audit logging.
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      getRequest();
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      /* outside request context (tests) */
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const audit = (
      outcome: "allowed" | "denied" | "rate_limited" | "invalid",
      reason: string,
      storagePath: string | null,
      metadata: Record<string, unknown> = {},
    ) => {
      supabaseAdmin
        .from("signed_audio_access_log")
        .insert({
          user_id: userId,
          outcome,
          reason,
          storage_path: storagePath,
          ip,
          user_agent: ua,
          metadata,
        })
        .then(({ error }) => {
          if (error) console.error("[signAudioUrl] audit insert failed", error);
        });
    };

    // Rate limit: 60 calls / minute per user, 120 / minute per IP.
    const rl = await supabaseAdmin.rpc("check_rate_limit", {
      _bucket_key: `u:${userId}`,
      _action: "sign_audio_url",
      _max_hits: 60,
      _window_secs: 60,
    });
    if (rl.data && Array.isArray(rl.data) && rl.data[0]?.allowed === false) {
      audit("rate_limited", "rate_limit_user", null, { retry_after_secs: rl.data[0].retry_after_secs });
      throw new Response("Too Many Requests", { status: 429 });
    }
    if (ip) {
      const rlIp = await supabaseAdmin.rpc("check_rate_limit", {
        _bucket_key: `ip:${ip}`,
        _action: "sign_audio_url",
        _max_hits: 120,
        _window_secs: 60,
      });
      if (rlIp.data && Array.isArray(rlIp.data) && rlIp.data[0]?.allowed === false) {
        audit("rate_limited", "rate_limit_ip", null, { retry_after_secs: rlIp.data[0].retry_after_secs });
        throw new Response("Too Many Requests", { status: 429 });
      }
    }

    const path = data.url.includes("/storage/")
      ? extractPath(data.url)
      : PATH_RE.test(data.url)
        ? data.url
        : null;
    if (!path) {
      audit("invalid", "invalid_path", null, { input: data.url.slice(0, 200) });
      return { url: null as string | null, expiresIn: 0 };
    }

    // Authorization: allow if (a) caller owns the path under play/<userId>/,
    // (b) caller is an admin, or (c) path is referenced by a published
    // play_tracks row (queued/playing) so listeners can stream it.
    const ownsPath = path.startsWith(`play/${userId}/`);
    let authorized = ownsPath;
    let reason = ownsPath ? "owner" : "";

    if (!authorized) {
      const { data: adminCheck } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (adminCheck === true) {
        authorized = true;
        reason = "admin";
      }
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
      if (track?.id) {
        authorized = true;
        reason = "published_track";
      }
    }

    if (!authorized) {
      audit("denied", "not_authorized", path);
      return { url: null as string | null, expiresIn: 0 };
    }

    // Cap signed URL lifetime to 10 minutes for listener access.
    const expiresIn = Math.min(Math.max(data.expiresIn ?? 600, 60), 60 * 10);
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error || !signed?.signedUrl) {
      audit("denied", "sign_failed", path, { error: error?.message });
      return { url: null as string | null, expiresIn: 0 };
    }
    audit("allowed", reason || "ok", path, { expires_in: expiresIn });
    return { url: signed.signedUrl, expiresIn };
  });