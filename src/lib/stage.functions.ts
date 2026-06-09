import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertHostOrMod(supabase: any, userId: string, streamId: string) {
  const [{ data: stream }, { data: roles }] = await Promise.all([
    supabase.from("streams").select("host_id").eq("id", streamId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const isHost = stream?.host_id === userId;
  const isMod = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
  if (!isHost && !isMod) throw new Error("Not authorized");
}

/** Set stream mode (broadcast/stage) and stage lock */
export const updateStreamMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      mode: z.enum(["broadcast", "stage"]).optional(),
      stageLocked: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    const patch: any = {};
    if (data.mode) patch.mode = data.mode;
    if (data.stageLocked !== undefined) patch.stage_locked = data.stageLocked;
    const { error } = await supabase.from("streams").update(patch).eq("id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Viewer raises hand */
export const raiseHand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: stream } = await supabase
      .from("streams").select("stage_locked").eq("id", data.streamId).maybeSingle();
    if (stream?.stage_locked) throw new Error("Stage is locked");
    const { error } = await supabase
      .from("raise_hand_requests")
      .upsert({ stream_id: data.streamId, user_id: userId, status: "pending" }, { onConflict: "stream_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Host responds to a raise-hand: accept moves to green_room or speaker, decline rejects */
export const respondHand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      requestId: z.string().uuid(),
      action: z.enum(["accept_green_room", "accept_stage", "decline"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: req } = await supabase
      .from("raise_hand_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!req) throw new Error("Request not found");
    await assertHostOrMod(supabase, userId, req.stream_id);

    if (data.action === "decline") {
      await supabase.from("raise_hand_requests").update({ status: "declined" }).eq("id", req.id);
      return { ok: true };
    }

    const stageRole = data.action === "accept_stage" ? "speaker" : "green_room";
    const { error: spErr } = await supabase
      .from("stage_participants")
      .upsert(
        { stream_id: req.stream_id, user_id: req.user_id, stage_role: stageRole },
        { onConflict: "stream_id,user_id" },
      );
    if (spErr) throw new Error(spErr.message);
    await supabase.from("raise_hand_requests").update({ status: "accepted" }).eq("id", req.id);
    return { ok: true };
  });

/** Host moves a participant between stage_role values */
export const setStageRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      stageRole: z.enum(["host", "speaker", "listener", "green_room"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    // Enforce caps: max 5 hosts, max 5 guests (speakers)
    if (data.stageRole === "host" || data.stageRole === "speaker") {
      const { data: existing } = await supabase
        .from("stage_participants")
        .select("user_id, stage_role")
        .eq("stream_id", data.streamId);
      const already = (existing ?? []).find((r: any) => r.user_id === data.targetUserId);
      const count = (existing ?? []).filter(
        (r: any) => r.stage_role === data.stageRole && r.user_id !== data.targetUserId,
      ).length;
      const cap = 5;
      if (count >= cap) {
        throw new Error(
          data.stageRole === "host" ? "Host limit reached (5)" : "Guest limit reached (5)",
        );
      }
      void already;
    }
    const { error } = await supabase
      .from("stage_participants")
      .upsert(
        { stream_id: data.streamId, user_id: data.targetUserId, stage_role: data.stageRole },
        { onConflict: "stream_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove a participant entirely from the stage record */
export const removeStageParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ streamId: z.string().uuid(), targetUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    const { error } = await supabase
      .from("stage_participants")
      .delete()
      .eq("stream_id", data.streamId)
      .eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Guest leaves the stage and returns to listener */
export const leaveStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("stage_participants")
      .upsert(
        { stream_id: data.streamId, user_id: userId, stage_role: "listener" },
        { onConflict: "stream_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Host mutes/unmutes a stage participant. Mute writes a future timestamp;
 *  unmute clears it. Clients enforce by checking muted_until > now. */
export const setParticipantMute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      mute: z.boolean(),
      durationMinutes: z.number().int().min(1).max(360).default(60),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHostOrMod(supabase, userId, data.streamId);
    const mutedUntil = data.mute
      ? new Date(Date.now() + data.durationMinutes * 60_000).toISOString()
      : null;
    const { error } = await supabase
      .from("stage_participants")
      .update({ muted_until: mutedUntil })
      .eq("stream_id", data.streamId)
      .eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });