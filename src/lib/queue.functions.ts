import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertHost(supabase: any, userId: string, streamId: string) {
  const [{ data: stream }, { data: roles }] = await Promise.all([
    supabase.from("streams").select("host_id").eq("id", streamId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const isHost = stream?.host_id === userId;
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  if (!isHost && !isAdmin) throw new Error("Not authorized");
}

export const joinQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      genre: z.string().max(60).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: max } = await supabase
      .from("stream_queue").select("position").eq("stream_id", data.streamId)
      .order("position", { ascending: false }).limit(1).maybeSingle();
    const nextPos = ((max?.position as number | undefined) ?? 0) + 1;
    const { error } = await supabase
      .from("stream_queue")
      .upsert(
        { stream_id: data.streamId, user_id: userId, position: nextPos, genre: data.genre, status: "queued" },
        { onConflict: "stream_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      orderedIds: z.array(z.string().uuid()).min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);
    // Update positions sequentially
    for (let i = 0; i < data.orderedIds.length; i++) {
      await supabase.from("stream_queue")
        .update({ position: i + 1 })
        .eq("id", data.orderedIds[i])
        .eq("stream_id", data.streamId);
    }
    return { ok: true };
  });

export const setQueueStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      queueId: z.string().uuid(),
      status: z.enum(["queued", "on_stage", "done", "removed"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);
    const { error } = await supabase
      .from("stream_queue")
      .update({ status: data.status })
      .eq("id", data.queueId)
      .eq("stream_id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ streamId: z.string().uuid(), queueId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);
    const { error } = await supabase
      .from("stream_queue").delete()
      .eq("id", data.queueId).eq("stream_id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });