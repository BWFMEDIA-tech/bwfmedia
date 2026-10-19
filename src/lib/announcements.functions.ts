import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { announcementContentSchema, groupAnnouncements } from "./announcement-edit";

export const ANNOUNCEMENT_AUDIENCES = ["everyone", "artist", "host", "listener"] as const;

const Schema = announcementContentSchema.extend({
  audiences: z.array(z.enum(ANNOUNCEMENT_AUDIENCES)).min(1),
  email: z.boolean().default(false),
});

/** Admin-only: sends an in-app notification to every member in the chosen groups. */
export const sendAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => Schema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let mediaUrl: string | null = null;
    if (data.mediaPath && data.mediaType) {
      const { data: signed, error } = await supabaseAdmin.storage.from("announcement-media")
        .createSignedUrl(data.mediaPath, 60 * 60 * 24 * 365);
      if (error || !signed) throw new Error("Couldn't read the uploaded file");
      mediaUrl = signed.signedUrl;
    }
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
          .from("user_roles").select("user_id").in("role", (data.audiences.includes("listener") ? [...data.audiences, "member"] : data.audiences) as any).range(from, from + 999);
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
    const createdAt = new Date().toISOString();
    const rows = recipients.map((uid) => ({
      created_at: createdAt,
      user_id: uid,
      type: data.kind === "event" ? "announcement_event" : "announcement_update",
      title: data.title,
      body: data.body || null,
      link: data.link || null,
      actor_id: context.userId,
      media_url: mediaUrl,
      media_type: mediaUrl ? data.mediaType ?? null : null,
    }));
    let sent = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
      sent += Math.min(500, rows.length - i);
    }
    let emailed = 0;
    let emailError: string | null = null;
    if (data.email) {
      // Respect members who turned email alerts off.
      const noEmail = new Set<string>();
      for (let i = 0; i < all.length; i += 500) {
        const { data: prefs } = await supabaseAdmin.from("notification_preferences")
          .select("user_id").eq("email", false).in("user_id", all.slice(i, i + 500));
        prefs?.forEach((p: any) => noEmail.add(p.user_id));
      }
      const want = new Set(all.filter((id) => !noEmail.has(id)));
      const emails: string[] = [];
      for (let page = 1; ; page++) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(error.message);
        list.users.forEach((u) => { if (u.email && want.has(u.id)) emails.push(u.email); });
        if (list.users.length < 1000) break;
      }
      const { emailAnnouncement } = await import("@/lib/announcement-email.server");
      const r = await emailAnnouncement(emails, {
        kind: data.kind, title: data.title, body: data.body || undefined, link: data.link || undefined,
        mediaUrl: mediaUrl ?? undefined, mediaType: data.mediaType,
      });
      emailed = r.sent;
      emailError = r.error;
    }
    return { sent, skipped: off.size, emailed, emailError };
  });

export const listSentAnnouncements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ before: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("notifications")
      .select("id, actor_id, created_at, type, title, body, link, media_url, media_type")
      .in("type", ["announcement_update", "announcement_event"])
      .order("created_at", { ascending: false }).limit(1000);
    if (data.before) query = query.lt("created_at", data.before);
    const { data: rows, error } = await query;
    if (error) throw new Error("Couldn't load sent announcements");
    return { announcements: groupAnnouncements(rows ?? []), next: rows?.length === 1000 ? rows[rows.length - 1]?.created_at : undefined };
  });

export const editAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => announcementContentSchema.extend({ id: z.string().uuid(), removeMedia: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: original, error: readError } = await supabaseAdmin.from("notifications")
      .select("id, actor_id, created_at, type, title, body, link, media_url, media_type")
      .eq("id", data.id).in("type", ["announcement_update", "announcement_event"]).maybeSingle();
    if (readError || !original) throw new Error("Announcement no longer available");
    let mediaUrl = data.removeMedia ? null : original.media_url;
    let mediaType = data.removeMedia ? null : original.media_type;
    if (data.mediaPath) {
      if (!data.mediaType) throw new Error("Choose an image or video");
      const { data: signed, error } = await supabaseAdmin.storage.from("announcement-media").createSignedUrl(data.mediaPath, 60 * 60 * 24 * 365);
      if (error || !signed) throw new Error("Couldn't read the uploaded file");
      mediaUrl = signed.signedUrl; mediaType = data.mediaType;
    }
    const changes = { title: data.title, body: data.body || null, link: data.link || null,
      type: data.kind === "event" ? "announcement_event" : "announcement_update", media_url: mediaUrl, media_type: mediaType };
    const { error: auditError } = await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId, category: "announcements", action: "edit_announcement",
      target_id: original.id, target_type: "announcement", summary: "Edit sent announcement",
      metadata: { before: original, after: changes },
    });
    if (auditError) throw new Error("Couldn't record the edit; changes were not saved");
    let query = supabaseAdmin.from("notifications").update(changes)
      .eq("created_at", original.created_at).eq("type", original.type).eq("title", original.title);
    for (const key of ["actor_id", "body", "link", "media_url", "media_type"] as const) {
      query = original[key] === null ? query.is(key, null) : query.eq(key, original[key]);
    }
    const { error, count } = await query.select("id", { count: "exact", head: true });
    if (error) throw new Error("Couldn't save the announcement");
    return { updated: count ?? 0 };
  });
