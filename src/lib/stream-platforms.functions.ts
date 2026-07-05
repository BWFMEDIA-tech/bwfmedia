import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// List the current user's linked streaming platforms (metadata only —
// tokens/keys never leave the server).
export const listMyStreamPlatformConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stream_platform_connections")
      .select("id, platform, account_label, connected_at")
      .eq("user_id", context.userId)
      .order("connected_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const disconnectStreamPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ platform: z.string().min(1).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    // ON DELETE CASCADE on stream_platform_credentials handles token cleanup.
    const { error } = await context.supabase
      .from("stream_platform_connections")
      .delete()
      .eq("user_id", context.userId)
      .eq("platform", data.platform);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Kick has no OAuth broadcasting API — creators paste their RTMP URL + key.
// Stored in stream_platform_credentials (service-role only) via supabaseAdmin.
export const saveKickRtmp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        accountLabel: z.string().trim().min(1).max(80),
        rtmpUrl: z.string().trim().url().max(400),
        rtmpKey: z.string().trim().min(4).max(400),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn, error: cErr } = await supabaseAdmin
      .from("stream_platform_connections")
      .upsert(
        {
          user_id: context.userId,
          platform: "kick",
          account_label: data.accountLabel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform" },
      )
      .select("id")
      .single();
    if (cErr || !conn) throw new Error(cErr?.message || "Failed to save connection");
    const { error: credErr } = await supabaseAdmin
      .from("stream_platform_credentials")
      .upsert({
        connection_id: conn.id,
        rtmp_url: data.rtmpUrl,
        rtmp_key: data.rtmpKey,
        updated_at: new Date().toISOString(),
      });
    if (credErr) throw new Error(credErr.message);
    return { ok: true };
  });

// Record which platforms a stream was configured to broadcast to. Actual
// restream fan-out is a follow-up; today this just captures intent + status.
export const setStreamDestinations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        streamId: z.string().uuid(),
        platforms: z.array(z.string().min(1).max(32)).max(8),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.platforms.length === 0) return { ok: true, inserted: 0 };
    const rows = data.platforms.map((p) => ({
      stream_id: data.streamId,
      user_id: context.userId,
      platform: p,
      status: "pending" as const,
    }));
    const { error } = await context.supabase
      .from("stream_destinations")
      .upsert(rows, { onConflict: "stream_id,platform" });
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });

export const listStreamDestinations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ streamId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("stream_destinations")
      .select("id, platform, status, error_message, started_at")
      .eq("stream_id", data.streamId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });