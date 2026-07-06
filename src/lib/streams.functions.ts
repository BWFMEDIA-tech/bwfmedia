import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "stream";
}

async function assertCanBroadcast(supabase: any, userId: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  // Artists are NOT broadcasters — they may only join existing stages as
  // guests via stage_participants. Starting/ending a stream is restricted to
  // platform staff (admin / host / manager).
  const ok = (roles ?? []).some((r: any) =>
    r.role === "admin" || r.role === "host" || r.role === "manager",
  );
  if (!ok) throw new Error("Not authorized to start streams");
}

export const startOrResumeStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().min(1).max(120).default("BWF Live"),
      category: z.string().min(1).max(80).optional(),
      description: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCanBroadcast(supabase, userId);

    // Reuse an existing live stream for this host if any
    const { data: existing } = await supabase
      .from("streams")
      .select("*")
      .eq("host_id", userId)
      .in("status", ["idle", "live"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.status !== "live") {
        await supabase.from("streams")
          .update({
            status: "live",
            started_at: new Date().toISOString(),
            title: data.title,
            category: data.category ?? existing.category ?? null,
            description: data.description ?? existing.description ?? null,
          })
          .eq("id", existing.id);
      }
      return { id: existing.id, room_name: existing.room_name, title: data.title };
    }

    const roomName = `${slugify(data.title)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: created, error } = await supabase
      .from("streams")
      .insert({
        host_id: userId,
        title: data.title,
        room_name: roomName,
        status: "live",
        started_at: new Date().toISOString(),
        category: data.category ?? null,
        description: data.description ?? null,
      })
      .select("id, room_name, title")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const endStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only host or admin can end a stream.
    const { data: row } = await supabase
      .from("streams").select("host_id").eq("id", data.streamId).maybeSingle();
    if (!row) throw new Error("Stream not found");
    if (row.host_id !== userId) {
      const { data: adm } = await supabase
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adm) throw new Error("Not authorized");
    }
    const { error } = await supabase
      .from("streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanently delete a stream. Host or admin only. */
export const deleteStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("streams").select("host_id").eq("id", data.streamId).maybeSingle();
    if (!row) throw new Error("Stream not found");
    if (row.host_id !== userId) {
      const { data: adm } = await supabase
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adm) throw new Error("Not authorized");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("streams").delete().eq("id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStreamByRoom = createServerFn({ method: "POST" })
*** placeholder ***
  .inputValidator((input) =>
    z.object({ roomName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    // Public read of streams (RLS allows). Use anon client via env publishable key.
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data: row, error } = await client
      .from("streams")
      .select("id, title, room_name, status, host_id, mode, stage_locked, started_at")
      .eq("room_name", data.roomName)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Returns the current user's active (idle/live) stream if any. Used to
 *  auto-resume a host's session after a page refresh. */
export const getMyActiveStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("streams")
      .select("id, room_name, title, status, mode, stage_locked, started_at, host_id, host_transfer_mode")
      .eq("host_id", userId)
      .in("status", ["idle", "live"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

/** Update the thumbnail_url for a stream. Host or admin only. */
export const updateStreamThumbnail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      thumbnailUrl: z.string().min(1).max(2048).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("streams").select("host_id").eq("id", data.streamId).maybeSingle();
    if (!row) throw new Error("Stream not found");
    if (row.host_id !== userId) {
      const { data: adm } = await supabase
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!adm) throw new Error("Not authorized");
    }
    const { error } = await supabase
      .from("streams")
      .update({ thumbnail_url: data.thumbnailUrl })
      .eq("id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true, thumbnailUrl: data.thumbnailUrl };
  });