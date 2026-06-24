import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Stage snapshot — a single round-trip on join that replaces the old
 * pattern of issuing 3–4 independent queries per page mount and then
 * subscribing to every postgres_changes feed in sight.
 *
 * Returns only public, sanitized columns. No auth required. Audience
 * headcount comes from `stage_participants` row count (cheap, indexed)
 * so we don't have to spin up a Realtime presence channel just to show
 * "12 listeners" on first paint.
 */
export const getPlayArenaSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        roomName: z
          .string()
          .min(1)
          .max(128)
          .regex(/^[a-zA-Z0-9_-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: stream } = await client
      .from("streams")
      .select("id, title, room_name, status, mode, host_id")
      .eq("room_name", data.roomName)
      .maybeSingle();
    if (!stream) return null;

    const [{ data: tracks }, { count: audienceCount }] = await Promise.all([
      client
        .from("play_tracks")
        .select(
          "id, title, artist_name, audio_url, cover_url, score, like_count, dislike_count, status, position, boosted, created_at",
        )
        .eq("stream_id", stream.id)
        .in("status", ["queued", "playing"])
        .order("status", { ascending: true })
        .order("boosted", { ascending: false })
        .order("position", { ascending: true }),
      client
        .from("stage_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("stream_id", stream.id),
    ]);

    const list = tracks ?? [];
    const playing = list.find((t) => t.status === "playing") ?? null;
    const queue = list.filter((t) => t.status === "queued");
    const votes: Record<string, { up: number; down: number; score: number }> = {};
    for (const t of list) {
      votes[t.id] = { up: t.like_count ?? 0, down: t.dislike_count ?? 0, score: t.score ?? 0 };
    }

    return {
      stream: {
        id: stream.id,
        title: stream.title,
        roomName: stream.room_name,
        status: stream.status,
        mode: stream.mode,
        hostId: stream.host_id,
      },
      playing,
      queue,
      votes,
      audienceCount: audienceCount ?? 0,
    };
  });