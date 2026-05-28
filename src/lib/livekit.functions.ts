```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  AccessToken,
  RoomServiceClient,
} from "livekit-server-sdk";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LIVEKIT_API_KEY =
  process.env.LIVEKIT_API_KEY!;

const LIVEKIT_API_SECRET =
  process.env.LIVEKIT_API_SECRET!;

const LIVEKIT_URL =
  process.env.LIVEKIT_URL!;

if (
  !LIVEKIT_API_KEY ||
  !LIVEKIT_API_SECRET ||
  !LIVEKIT_URL
) {
  throw new Error(
    "Missing LiveKit environment variables",
  );
}

const roomService =
  new RoomServiceClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );

const roleSchema = z.enum([
  "listener",
  "artist",
  "moderator",
  "admin",
]);

type UserRole = z.infer<
  typeof roleSchema
>;

const roomInputSchema = z.object({
  roomName: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

function isAdmin(role: UserRole) {
  return (
    role === "admin" ||
    role === "moderator"
  );
}

function canCreateRooms(
  role: UserRole,
) {
  return (
    role === "artist" ||
    role === "moderator" ||
    role === "admin"
  );
}

export const getLiveKitToken =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator((input) =>
      roomInputSchema.parse(input),
    )
    .handler(
      async ({ data, context }) => {
        const {
          userId,
          supabase,
        } = context;

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            display_name,
            role,
            avatar_url
          `)
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          throw new Error(
            "Failed to load profile",
          );
        }

        if (!profile) {
          throw new Error(
            "Profile not found",
          );
        }

        const role =
          roleSchema.parse(
            profile.role ||
              "listener",
          );

        const {
          data: room,
          error: roomError,
        } = await supabase
          .from("rooms")
          .select(`
            id,
            slug,
            title,
            owner_id,
            is_public
          `)
          .eq(
            "slug",
            data.roomName,
          )
          .maybeSingle();

        if (roomError) {
          throw new Error(
            "Failed to load room",
          );
        }

        if (!room) {
          throw new Error(
            "Room not found",
          );
        }

        const roomOwner =
          room.owner_id === userId;

        const allowedToJoin =
          room.is_public ||
          roomOwner ||
          isAdmin(role);

        if (!allowedToJoin) {
          throw new Error(
            "Unauthorized room access",
          );
        }

        const canPublish =
          roomOwner ||
          isAdmin(role);

        const roomCreate =
          canCreateRooms(role);

        try {
          await roomService.getRoom(
            data.roomName,
          );
        } catch {
          if (roomCreate) {
            await roomService.createRoom(
              {
                name:
                  data.roomName,
                emptyTimeout:
                  60 * 10,
                maxParticipants: 500,
              },
            );
          }
        }

        const at =
          new AccessToken(
            LIVEKIT_API_KEY,
            LIVEKIT_API_SECRET,
            {
              identity: userId,

              name:
                profile.display_name ||
                "Anonymous",

              ttl: "6h",

              metadata:
                JSON.stringify({
                  userId,
                  role,
                  roomId:
                    room.id,
                  roomName:
                    room.slug,
                  displayName:
                    profile.display_name,
                  avatar:
                    profile.avatar_url,
                }),
            },
          );

        at.addGrant({
          room: data.roomName,
          roomJoin: true,
          canSubscribe: true,
          canPublish,
          canPublishData:
            canPublish,
          roomAdmin:
            isAdmin(role),
          roomCreate,
        });

        const token =
          await at.toJwt();

        await supabase
          .from(
            "livekit_token_logs",
          )
          .insert({
            user_id: userId,
            room_name:
              data.roomName,
            role,
            can_publish:
              canPublish,
            created_at:
              new Date().toISOString(),
          });

        return {
          success: true,
          token,
          wsUrl: LIVEKIT_URL,
          identity: userId,
          role,

          permissions: {
            canPublish,

            roomAdmin:
              isAdmin(role),

            roomCreate,
          },
        };
      },
    );

export const getGuestLiveKitToken =
  createServerFn({
    method: "POST",
  })
    .inputValidator((input) =>
      z
        .object({
          roomName: z
            .string()
            .min(1)
            .max(128)
            .regex(
              /^[a-zA-Z0-9_-]+$/,
            ),

          displayName:
            z.string()
              .min(1)
              .max(80),
        })
        .parse(input),
    )

    .handler(async ({ data }) => {
      const identity = `guest_${crypto.randomUUID()}`;

      const at =
        new AccessToken(
          LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET,
          {
            identity,

            name:
              data.displayName,

            ttl: "90m",

            metadata:
              JSON.stringify({
                role: "guest",
                guest: true,
              }),
          },
        );

      at.addGrant({
        room: data.roomName,
        roomJoin: true,
        canSubscribe: true,
        canPublish: false,
        canPublishData: false,
        roomAdmin: false,
        roomCreate: false,
      });

      const token =
        await at.toJwt();

      return {
        success: true,
        token,
        wsUrl: LIVEKIT_URL,
        identity,
        role: "guest",
      };
    });
```

