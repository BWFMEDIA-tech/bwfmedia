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

    // Banned users keep their JWT, so block at token issuance — otherwise
    // they could call the LiveKit SDK directly and publish to any room.
    const { data: ban } = await supabase
      .from("user_bans")
      .select("id, expires_at")
      .eq("user_id", userId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();
    if (ban) throw new Error("Your account has been suspended.");

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

    // Mirror LiveKit publish rights to the stage role recorded in
    // `stage_participants`. Only host / co_host / speaker get canPublish;
    // listeners (and anyone who hasn't been promoted) cannot publish even
    // by driving the LiveKit SDK directly. Hosts/admins always can.
    let canPublish = isHost;
    if (!canPublish && stream) {
      const { data: streamIdRow } = await supabase
        .from("streams")
        .select("id")
        .eq("room_name", data.roomName)
        .maybeSingle();
      if (streamIdRow?.id) {
        const { data: sp } = await supabase
          .from("stage_participants")
          .select("stage_role")
          .eq("stream_id", streamIdRow.id)
          .eq("user_id", userId)
          .maybeSingle();
        const role = sp?.stage_role as string | undefined;
        if (role === "host" || role === "co_host" || role === "speaker") {
          canPublish = true;
        }
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
      canPublishSources: [
        TrackSource.MICROPHONE,
        TrackSource.CAMERA,
        TrackSource.SCREEN_SHARE,
        TrackSource.SCREEN_SHARE_AUDIO,
      ],
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomCreate: isHost,
    });

    const token = await at.toJwt();

    // Bind participant state to a successful token issuance without ever
    // downgrading an existing speaker/host row. Re-tokening after promotion
    // must not kick the guest back to listener.
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
        const { data: existingParticipant } = await supabaseAdmin
          .from("stage_participants")
          .select("stage_role")
          .eq("stream_id", streamRow.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!existingParticipant) {
          await supabaseAdmin
            .from("stage_participants")
            .insert({ stream_id: streamRow.id, user_id: userId, stage_role: role });
        }
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

    // Only mint guest tokens for rooms backed by a currently-live stream.
    // Guests are listener-only — publishing requires an authenticated account
    // with stage_participants standing (see getLiveKitToken).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: streamRow } = await supabaseAdmin
      .from("streams")
      .select("status")
      .eq("room_name", data.roomName)
      .maybeSingle();
    if (!streamRow || streamRow.status !== "live") {
      throw new Error("Stream is not live");
    }

    const identity = `guest_${crypto.randomUUID()}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: data.displayName,
      ttl: 60 * 60 * 3,
    });
    at.addGrant({
      room: data.roomName,
      roomJoin: true,
      // Unauthenticated guests are listener-only. Speaking/publishing
      // requires sign-in so the host can identify, moderate, and remove
      // participants. Prevents anonymous audio/video/screen-share injection.
      canPublish: false,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return { token, wsUrl, identity };
  });