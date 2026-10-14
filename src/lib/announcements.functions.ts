import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ANNOUNCEMENT_AUDIENCES = ["everyone", "artist", "host", "listener"] as const;

const Schema = z.object({
  audiences: z.array(z.enum(ANNOUNCEMENT_AUDIENCES)).min(1),
  kind: z.enum(["update", "event"]),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(500).optional(),
  // Internal links only, so announcements can't send members off-site.
  link: z.string().trim().regex(/^\/[A-Za-z0-9/_\-?=&.#]*$/).max(200).optional().or(z.literal("")),
});

/** Admin-only: sends an in-app notification to every member in the chosen groups. */
export const sendAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => Schema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ids = new Set<string>();
    if (data.audiences.includes("everyone")) {
      for (let from = 0; ; from += 1000) {
        const { data: rows, error } = await supabaseAdmin.from("profiles").select("id").range(from, from + 999);
        if (error) throw new Error(error.message);
        rows?.forEach((r: any) => ids.add(r.id));
        if (!rows || rows.length < 1000) break;
      }
    } else {
      for (let from = 0; ; from += 1000) {
        const { data: rows, error } = await supabaseAdmin
          .from("user_roles").select("user_id").in("role", data.audiences as any).range(from, from + 999);
        if (error) throw new Error(error.message);
        rows?.forEach((r: any) => ids.add(r.user_id));
        if (!rows || rows.length < 1000) break;
      }
    }
    const all = [...ids];
    // Respect members who turned in-app notifications off.
    const off = new Set<string>();
    for (let i = 0; i < all.length; i += 500) {
      const { data: prefs } = await supabaseAdmin.from("notification_preferences")
        .select("user_id").eq("in_app", false).in("user_id", all.slice(i, i + 500));
      prefs?.forEach((p: any) => off.add(p.user_id));
    }
    const recipients = all.filter((id) => !off.has(id));
    const rows = recipients.map((uid) => ({
      user_id: uid,
      type: data.kind === "event" ? "announcement_event" : "announcement_update",
      title: data.title,
      body: data.body || null,
      link: data.link || null,
      actor_id: context.userId,
    }));
    let sent = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
      sent += Math.min(500, rows.length - i);
    }
    return { sent, skipped: off.size };
  });
