import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { TrackSource } from "@livekit/protocol";
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

    // Allow every authenticated participant to publish audio so guests can
    // unmute themselves on any device (desktop, iPad, iPhone, etc.). The
    // UI and StageMicSync still default listeners to muted; the host can
    // mute via `muted_until`.
    const canPublish = true;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: profile?.display_name || "Guest",
      ttl: 60 * 60 * 6,
    });
    at.addGrant({
      room: data.roomName,
      roomJoin: true,
      canPublish,
      canPublishSources: [TrackSource.MICROPHONE],
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
      // Unauthenticated guests may publish their mic so they can speak from
      // any device after tapping unmute. Audio is muted by default in the UI.
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return { token, wsUrl, identity };
  });