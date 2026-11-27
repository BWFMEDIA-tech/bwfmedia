import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { eventInputSchema } from "@/lib/profile-events";

const EVENT_COLS = "id,title,description,event_type,starts_at,ends_at,location,cover_image_url,status,link_url,created_at,label_id";
function publicEventClient() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
}
async function withFlyers(client: ReturnType<typeof publicEventClient>, rows: EventRow[]) {
  const paths = [...new Set(rows.map(r => r.cover_image_url).filter((p): p is string => !!p && !p.startsWith('https://')))];
  if (!paths.length) return rows;
  const { data } = await client.storage.from('event-flyers').createSignedUrls(paths, 3600);
  const urls = new Map((data ?? []).map(r => [r.path, r.signedUrl]));
  return rows.map(r => ({ ...r, cover_image_url: r.cover_image_url?.startsWith('https://') ? r.cover_image_url : urls.get(r.cover_image_url ?? '') ?? null }));
}

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
  label_id?: string | null;
};

export const listPublicEvents = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicEventClient();
  const { data, error } = await supabase
    .from("events")
    .select("id,title,description,event_type,starts_at,ends_at,location,cover_image_url,status,link_url,created_at")
    .in("status", ["scheduled", "live", "ended"])
    .order("starts_at", { ascending: true }).limit(500);
  if (error) throw new Error(error.message);
  return withFlyers(supabase, (data ?? []) as EventRow[]);
});

export const listProfileEvents = createServerFn({ method: "GET" })
  .inputValidator((d: { artistId?: string; labelId?: string }) => z.object({artistId: z.string().uuid().optional(), labelId: z.string().uuid().optional()}).refine(v => !!v.artistId !== !!v.labelId).parse(d))
  .handler(async ({data}) => {
    const client = publicEventClient();
    const result = data.labelId
      ? await client.rpc('list_label_showcases', { _label_id: data.labelId })
      : await client.from('events').select(EVENT_COLS).eq('created_by', data.artistId ?? '').in('status', ['scheduled','live','ended']).order('starts_at').limit(200);
    if (result.error) throw new Error('Events are unavailable right now.');
    return withFlyers(client, (result.data ?? []) as EventRow[]);
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
  label_id?: string | null;
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

// ---------- Artist-owned events (self-serve) ----------

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("events")
      .select(EVENT_COLS)
      .eq("created_by", context.userId)
      .order("starts_at", { ascending: true }).limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as EventRow[];
  });

export const createMyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EventInput) => {
    return eventInputSchema.parse(input);
  })
  .handler(async ({ data, context }) => {
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
        label_id: data.label_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as EventRow;
  });

export const updateMyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string } & Partial<EventInput>) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const update: Database["public"]["Tables"]["events"]["Update"] = {};
    if (patch.title !== undefined) update.title = patch.title?.trim();
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.event_type !== undefined) update.event_type = patch.event_type;
    if (patch.starts_at !== undefined) update.starts_at = patch.starts_at;
    if (patch.ends_at !== undefined) update.ends_at = patch.ends_at;
    if (patch.location !== undefined) update.location = patch.location;
    if (patch.cover_image_url !== undefined) update.cover_image_url = patch.cover_image_url;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.link_url !== undefined) update.link_url = patch.link_url;
    if (patch.label_id !== undefined) update.label_id = patch.label_id;
    const { data: previous, error: readError } = await context.supabase.from('events').select('*').eq('id', id).eq('created_by', context.userId).single();
    if (readError || !previous) throw new Error('Event not found or not yours.');
    eventInputSchema.parse({ ...previous, ...update });
    const { data: row, error } = await context.supabase
      .from("events")
      .update(update)
      .eq("id", id)
      .eq("created_by", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as EventRow;
  });

export const deleteMyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("events")
      .delete()
      .eq("id", data.id)
      .eq("created_by", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });