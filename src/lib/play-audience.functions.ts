import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public, sanitized view of the play arena for audience listeners.
 *  No auth required. Returns only fields safe for public exposure —
 *  never user IDs, emails, or other private metadata. */
export const getAudiencePlayState = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      roomName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
    );

    const { data: stream } = await client
      .from("streams")
      .select("id, title, room_name, status, mode")
      .eq("room_name", data.roomName)
      .maybeSingle();
    if (!stream) return null;

    const { data: playing } = await client
      .from("play_tracks")
      .select("id, title, artist_name, audio_url, cover_url, score, like_count, dislike_count")
      .eq("stream_id", stream.id)
      .eq("status", "playing")
      .maybeSingle();

    return {
      stream: {
        id: stream.id,
        title: stream.title,
        roomName: stream.room_name,
        status: stream.status,
        mode: stream.mode,
      },
      playing: playing ?? null,
    };
  });