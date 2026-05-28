import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * SECURE TOKEN INPUT
 * Frontend can ONLY request a room name.
 * Roles/permissions are decided ONLY by the backend.
 */
const tokenInput = z.object({
  roomName: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

/**
 * AUTHENTICATED USER TOKEN
 */
export const getLiveKitToken = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => tokenInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      throw new Error("LiveKit not configured");
    }

    const { userId, supabase } = context;

    /**
     * GET USER PROFILE + ROLE
     */
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load profile");
    }

    /**
     * DEFAULT ROLE
     */
    const role = profile?.role || "listener";

    /**
     * SECURE PERMISSION MODEL
     */
    const isAdmin = role === "admin" || role === "moderator";

    const canPublish = role === "artist" || role === "moderator" || role === "admin";

    /**
     * CREATE LIVEKIT TOKEN
     */
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: profile?.display_name || "Guest",
      ttl: 60 * 60 * 6, // 6 hours
    });

    /**
     * ADD SECURE GRANTS
     */
    at.addGrant({
      room: data.roomName,

      roomJoin: true,

      canSubscribe: true,

      canPublish,

      canPublishData: canPublish,

      roomAdmin: isAdmin,

      roomCreate: isAdmin,
    });

    const token = await at.toJwt();

    return {
      token,
      wsUrl,
      identity: userId,
      role,
    };
  });

/**
 * GUEST TOKEN
 * Public invite access
 * Guests can WATCH only
 */
export const getGuestLiveKitToken = createServerFn({
  method: "POST",
})
  .inputValidator((input) =>
    z
      .object({
        roomName: z
          .string()
          .min(1)
          .max(128)
          .regex(/^[a-zA-Z0-9_-]+$/),

        displayName: z.string().min(1).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      throw new Error("LiveKit not configured");
    }

    /**
     * RANDOM GUEST IDENTITY
     */
    const identity = `guest_${crypto.randomUUID()}`;

    /**
     * CREATE GUEST TOKEN
     */
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: data.displayName,
      ttl: 60 * 60 * 3, // 3 hours
    });

    /**
     * GUESTS CAN WATCH ONLY
     */
    at.addGrant({
      room: data.roomName,

      roomJoin: true,

      canSubscribe: true,

      canPublish: false,

      canPublishData: false,

      roomAdmin: false,

      roomCreate: false,
    });

    const token = await at.toJwt();

    return {
      token,
      wsUrl,
      identity,
      role: "guest",
    };
  });
