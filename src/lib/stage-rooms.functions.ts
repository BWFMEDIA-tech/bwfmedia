import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StageStatus = z.enum(["idle", "live", "ended"]);

/** Create a new Stage Room owned by the caller. */
export const createStageRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const livekitRoom = `stage-${crypto.randomUUID()}`;
    const { data: row, error } = await supabase
      .from("stage_rooms")
      .insert({
        host_id: userId,
        title: data.title ?? "Untitled Stage",
        description: data.description ?? null,
        livekit_room: livekitRoom,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Read a single Stage Room. Requires an authenticated viewer (RLS-gated). */
export const getStageRoom = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("stage_rooms")
      .select("id, host_id, title, description, status, stage_state, audience_count, livekit_room, started_at, ended_at, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Update stage_state jsonb. Host only. */
export const updateStageState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      patch: z.record(z.string(), z.any()),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("stage_rooms")
      .select("host_id, stage_state")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Stage room not found");
    if (existing.host_id !== userId) throw new Error("Not authorized");
    const merged = { ...(existing.stage_state as object ?? {}), ...data.patch };
    const { error } = await supabase
      .from("stage_rooms")
      .update({ stage_state: merged })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Transition a Stage Room status (host only). */
export const setStageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), status: StageStatus }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { status: "idle" | "live" | "ended"; started_at?: string; ended_at?: string } = { status: data.status };
    if (data.status === "live") patch.started_at = new Date().toISOString();
    if (data.status === "ended") patch.ended_at = new Date().toISOString();
    const { error } = await supabase
      .from("stage_rooms")
      .update(patch)
      .eq("id", data.id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** List Stage Rooms owned by the caller. */
export const listMyStageRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("stage_rooms")
      .select("id, title, status, audience_count, started_at, ended_at, created_at")
      .eq("host_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });