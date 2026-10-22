import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin-guard";

export type NavRow = {
  id: string;
  slot: "primary" | "discover" | "store";
  to_path: string;
  label: string;
  icon: string;
  position: number;
  visible: boolean;
};

/** Public read of the editable site navigation. Falls back to an empty list (callers keep hardcoded defaults). */
export const getSiteNav = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await supabase
      .from("site_nav_items")
      .select("id, slot, to_path, label, icon, position, visible")
      .order("slot", { ascending: true })
      .order("position", { ascending: true });
    if (error || !data) return { items: [] as NavRow[] };
    return { items: data as unknown as NavRow[] };
  } catch {
    return { items: [] as NavRow[] };
  }
});

/** Admin-only: persist the full navigation (rename, reorder, hide, add, delete). */
export const adminSaveNavItems = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: { items: NavRow[] }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items = data.items;
    if (!Array.isArray(items)) throw new Error("Invalid navigation payload");

    // Delete rows that were removed in the editor.
    const keepIds = items.map((i) => i.id);
    const { data: existing } = await (supabaseAdmin as any)
      .from("site_nav_items")
      .select("id");
    const stale = (existing ?? []).map((r: any) => r.id).filter((id: string) => !keepIds.includes(id));
    if (stale.length) {
      const { error: delErr } = await (supabaseAdmin as any).from("site_nav_items").delete().in("id", stale);
      if (delErr) throw new Error(delErr.message);
    }

    const rows = items.map((i) => ({
      id: i.id,
      slot: i.slot,
      to_path: i.to_path,
      label: i.label,
      icon: i.icon,
      position: i.position,
      visible: i.visible,
    }));
    const { error } = await (supabaseAdmin as any)
      .from("site_nav_items")
      .upsert(rows, { onConflict: "id" });
    if (error) throw new Error(error.message);

    const { logAudit } = await import("@/lib/audit.server");
    await logAudit({
      actorId: context.userId,
      action: "site_nav_saved",
      category: "admin",
      targetType: "site_nav_items",
      summary: `Saved ${items.length} navigation items`,
      metadata: { count: items.length },
    });

    return { ok: true };
  });
