import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard";

const tokenInput = z.object({
  roomName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

export const getLiveKitToken = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
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

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: profile?.display_name || "Guest",
      ttl: 60 * 60 * 6,
    });
    at.addGrant({
      room: data.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomCreate: isHost,
    });

    const token = await at.toJwt();
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