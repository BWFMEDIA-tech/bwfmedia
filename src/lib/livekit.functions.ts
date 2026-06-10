import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenInput = z.object({
  roomName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

export const getLiveKitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => tokenInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) throw new Error("LiveKit not configured");

    const { userId, supabase } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    // Server-side host check: only the actual stream host (or an admin) gets
    // LiveKit room admin/create grants. Never trust a client-supplied flag.
    const { data: stream } = await supabase
      .from("streams")
      .select("host_id")
      .eq("room_name", data.roomName)
      .maybeSingle();
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isHost = (stream?.host_id === userId) || !!adminRow;

    // Determine if this participant is allowed to publish audio. Only the
    // stream host, admins, and approved stage roles (co_host / speaker) may
    // publish — audience listeners get a subscribe-only token so the server
    // refuses any audio they try to push, even if a client tries to bypass
    // the UI mute.
    let canPublish = isHost;
    if (!canPublish && stream?.host_id) {
      const { data: streamRow2 } = await supabase
        .from("streams")
        .select("id")
        .eq("room_name", data.roomName)
        .maybeSingle();
      if (streamRow2?.id) {
        const { data: spRow } = await supabase
          .from("stage_participants")
          .select("stage_role")
          .eq("stream_id", streamRow2.id)
          .eq("user_id", userId)
          .maybeSingle();
        const role = (spRow?.stage_role as string | undefined) ?? null;
        canPublish = role === "host" || role === "co_host" || role === "speaker";
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: profile?.display_name || "Guest",
      ttl: 60 * 60 * 6,
    });
    at.addGrant({
      room: data.roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomCreate: isHost,
    });

    const token = await at.toJwt();

    // Bind participant state to a successful token issuance. This guarantees
    // RLS-visible "joined" status before the client subscribes to chat /
    // realtime, and prevents clients from registering for streams they
    // haven't actually joined via LiveKit.
    if (stream?.host_id && stream.host_id !== userId) {
      const role = isHost ? "host" : "listener";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // resolve stream id from room_name
      const { data: streamRow } = await supabaseAdmin
        .from("streams")
        .select("id, status")
        .eq("room_name", data.roomName)
        .maybeSingle();
      if (streamRow?.id && streamRow.status === "live") {
        await supabaseAdmin
          .from("stage_participants")
          .upsert(
            { stream_id: streamRow.id, user_id: userId, stage_role: role },
            { onConflict: "stream_id,user_id" },
          );
      }
    }

    return { token, wsUrl, identity: userId };
  });

// Public guest token (no auth required) — used by /stream/$room invite link
export const getGuestLiveKitToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      roomName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
      displayName: z.string().min(1).max(80),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !wsUrl) throw new Error("LiveKit not configured");

    const identity = `guest_${crypto.randomUUID()}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: data.displayName,
      ttl: 60 * 60 * 3,
    });
    at.addGrant({
      room: data.roomName,
      roomJoin: true,
      // Unauthenticated guests are view-only by default. Publishing is
      // gated by host promotion via stage_participants and a separately
      // issued authenticated token.
      canPublish: false,
      canSubscribe: true,
      canPublishData: false,
    });
    const token = await at.toJwt();
    return { token, wsUrl, identity };
  });