import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlaybackSource = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stage"), stage_room_ids: z.array(z.string().uuid()).default([]) }),
  z.object({ kind: z.literal("upload"), asset_url: z.string().url() }),
  z.object({ kind: z.literal("prerecord"), recording_id: z.string().uuid() }),
]);

function sbPublic() {
  // Lazily build a publishable-key server client (anon-scoped reads).
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Create a Broadcast owned by the caller. */
export const createBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      stream_title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      scheduled_for: z.string().datetime().optional(),
      playback_source: PlaybackSource.optional(),
      stage_room_id: z.string().uuid().optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const playback = data.playback_source ?? {
      kind: "stage" as const,
      stage_room_ids: data.stage_room_id ? [data.stage_room_id] : [],
    };
    const { data: row, error } = await supabase
      .from("broadcasts")
      .insert({
        host_id: userId,
        stream_title: data.stream_title ?? "Untitled Broadcast",
        description: data.description ?? null,
        scheduled_for: data.scheduled_for ?? null,
        playback_source: playback,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (playback.kind === "stage" && playback.stage_room_ids.length > 0) {
      const links = playback.stage_room_ids.map((sid, i) => ({
        broadcast_id: row.id,
        stage_room_id: sid,
        role: i === 0 ? "primary" : "secondary",
      }));
      await supabase.from("broadcast_stage_links").insert(links);
    }

    return row;
  });

/** Public read for shareable broadcast pages. */
export const getBroadcast = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sb = sbPublic();
    const [{ data: row, error }, { data: links }] = await Promise.all([
      sb.from("broadcasts")
        .select("id, host_id, stream_title, description, stream_status, viewer_count, playback_source, featured_content, scheduled_for, started_at, ended_at, created_at")
        .eq("id", data.id)
        .maybeSingle(),
      sb.from("broadcast_stage_links")
        .select("stage_room_id, role")
        .eq("broadcast_id", data.id),
    ]);
    if (error) throw new Error(error.message);
    if (!row) return null;
    return { ...row, stage_links: links ?? [] };
  });

/** Start the broadcast (mark live, set started_at). Does not touch stage rooms. */
export const startBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      stage_room_ids: z.array(z.string().uuid()).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.stage_room_ids && data.stage_room_ids.length > 0) {
      const links = data.stage_room_ids.map((sid, i) => ({
        broadcast_id: data.id,
        stage_room_id: sid,
        role: i === 0 ? "primary" : "secondary",
      }));
      await supabase
        .from("broadcast_stage_links")
        .upsert(links, { onConflict: "broadcast_id,stage_room_id" });
    }

    const { error } = await supabase
      .from("broadcasts")
      .update({ stream_status: "live", started_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** End the broadcast. Does NOT end any linked stage rooms. */
export const endBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("broadcasts")
      .update({ stream_status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Patch broadcast metadata (title, description, featured_content, playback_source). */
export const updateBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      stream_title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      featured_content: z.record(z.string(), z.any()).optional(),
      playback_source: PlaybackSource.optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (data.stream_title !== undefined) patch.stream_title = data.stream_title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.featured_content !== undefined) patch.featured_content = data.featured_content;
    if (data.playback_source !== undefined) patch.playback_source = data.playback_source;
    const { error } = await supabase
      .from("broadcasts")
      .update(patch as never)
      .eq("id", data.id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Link a stage room to a broadcast (one broadcast → many stages). */
export const linkStageToBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      broadcast_id: z.string().uuid(),
      stage_room_id: z.string().uuid(),
      role: z.enum(["primary", "secondary"]).default("secondary"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: b } = await supabase
      .from("broadcasts").select("host_id").eq("id", data.broadcast_id).maybeSingle();
    if (!b || b.host_id !== userId) throw new Error("Not authorized");
    const { error } = await supabase
      .from("broadcast_stage_links")
      .upsert({
        broadcast_id: data.broadcast_id,
        stage_room_id: data.stage_room_id,
        role: data.role,
      }, { onConflict: "broadcast_id,stage_room_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Unlink a stage room from a broadcast. */
export const unlinkStageFromBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      broadcast_id: z.string().uuid(),
      stage_room_id: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: b } = await supabase
      .from("broadcasts").select("host_id").eq("id", data.broadcast_id).maybeSingle();
    if (!b || b.host_id !== userId) throw new Error("Not authorized");
    const { error } = await supabase
      .from("broadcast_stage_links")
      .delete()
      .eq("broadcast_id", data.broadcast_id)
      .eq("stage_room_id", data.stage_room_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Caller's own broadcasts. */
export const listMyBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("broadcasts")
      .select("id, stream_title, stream_status, viewer_count, scheduled_for, started_at, ended_at, created_at")
      .eq("host_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Public list of currently-live broadcasts. */
export const listLiveBroadcasts = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = sbPublic();
    const { data, error } = await sb
      .from("broadcasts")
      .select("id, host_id, stream_title, description, viewer_count, started_at")
      .eq("stream_status", "live")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });