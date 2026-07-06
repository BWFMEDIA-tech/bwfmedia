// @auth-exempt: admin-only fn; verifies has_role("admin") inside handler before any privileged work.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { logAudit } from "@/lib/audit.server";

const APP_ROLES = ["admin", "host", "artist", "moderator", "member"] as const;

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().max(200).optional(),
        page: z.number().int().min(1).max(1000).default(1),
        perPage: z.number().int().min(1).max(200).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await (supabaseAdmin as any).auth.admin.listUsers({
      page: data.page,
      perPage: data.perPage,
    });
    if (error) throw new Error(error.message);
    const users = (list?.users ?? []) as Array<any>;
    const ids = users.map((u) => u.id);
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      (supabaseAdmin as any).from("user_roles").select("user_id, role").in("user_id", ids),
      (supabaseAdmin as any).from("profiles").select("id, display_name, avatar_url").in("id", ids),
    ]);
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));
    const q = (data.search ?? "").trim().toLowerCase();
    const rows = users
      .map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        roles: roleMap.get(u.id) ?? [],
        display_name: profileMap.get(u.id)?.display_name ?? null,
        avatar_url: profileMap.get(u.id)?.avatar_url ?? null,
      }))
      .filter((r) =>
        !q
          ? true
          : (r.email ?? "").toLowerCase().includes(q) ||
            (r.display_name ?? "").toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q),
      );
    return { users: rows, total: list?.total ?? rows.length };
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(APP_ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: (context as any).userId,
      action: "role.assign",
      category: "role",
      targetType: "user",
      targetId: data.userId,
      summary: `Granted role "${data.role}"`,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const removeRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(APP_ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.role === "admin" && data.userId === (context as any).userId) {
      throw new Error("Cannot remove your own admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: (context as any).userId,
      action: "role.remove",
      category: "role",
      targetType: "user",
      targetId: data.userId,
      summary: `Removed role "${data.role}"`,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.userId === (context as any).userId) {
      throw new Error("Cannot delete your own account");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit({
      actorId: (context as any).userId,
      action: "user.delete",
      category: "admin",
      targetType: "user",
      targetId: data.userId,
      summary: "Deleted user account",
    });
    return { ok: true };
  });