import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenInput = z.object({
  roomName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  isHost: z.boolean().default(false),
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
      roomAdmin: data.isHost,
      roomCreate: data.isHost,
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
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return { token, wsUrl, identity };
  });