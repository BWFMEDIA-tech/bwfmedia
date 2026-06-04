import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "stream";
}

export const startOrResumeStream = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ title: z.string().min(1).max(120).default("BWF Live") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

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
          .update({ status: "live", started_at: new Date().toISOString(), title: data.title })
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
      })
      .select("id, room_name, title")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const endStream = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStreamByRoom = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ roomName: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    // Public read of streams (RLS allows). Use anon client via env publishable key.
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data: row, error } = await client
      .from("streams")
      .select("id, title, room_name, status, host_id, mode, stage_locked")
      .eq("room_name", data.roomName)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });