import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  cover_image_url: string | null;
  status: string;
  link_url: string | null;
  created_at: string;
};

export const listPublicEvents = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("events")
    .select("id,title,description,event_type,starts_at,ends_at,location,cover_image_url,status,link_url,created_at")
    .in("status", ["scheduled", "live", "ended"])
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as EventRow[];
});

export const listAllEventsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("events")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as EventRow[];
  });

type EventInput = {
  title: string;
  description?: string | null;
  event_type?: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  cover_image_url?: string | null;
  status?: string;
  link_url?: string | null;
};

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EventInput) => {
    if (!input?.title?.trim()) throw new Error("Title required");
    if (!input?.starts_at) throw new Error("Start time required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("events")
      .insert({
        title: data.title.trim(),
        description: data.description ?? null,
        event_type: data.event_type ?? "event",
        starts_at: data.starts_at,
        ends_at: data.ends_at ?? null,
        location: data.location ?? null,
        cover_image_url: data.cover_image_url ?? null,
        status: data.status ?? "scheduled",
        link_url: data.link_url ?? null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as EventRow;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });