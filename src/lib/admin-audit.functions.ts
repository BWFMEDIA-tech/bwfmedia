// @auth-exempt: admin-only fn; verifies has_role("admin") inside handler before any privileged work.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { logAudit } from "@/lib/audit.server";

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        category: z
          .enum(["admin", "role", "stream", "ban", "payout", "moderation", "system"])
          .optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any)
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { entries: rows ?? [] };
  });

export const killAllStreams = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ reason: z.string().max(500).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { data: live } = await (supabaseAdmin as any)
      .from("streams")
      .select("id, title, room_name")
      .eq("status", "live");
    const ids = (live ?? []).map((s: any) => s.id);
    if (ids.length > 0) {
      const { error } = await (supabaseAdmin as any)
        .from("streams")
        .update({ status: "ended", ended_at: nowIso })
        .in("id", ids);
      if (error) throw new Error(error.message);
    }
    await logAudit({
      actorId: (context as any).userId,
      action: "stream.kill_switch",
      category: "stream",
      targetType: "stream",
      targetId: null,
      summary: `Global kill switch ended ${ids.length} live stream(s)`,
      metadata: { reason: data.reason ?? null, streams: live ?? [] },
    });
    return { ok: true, terminated: ids.length };
  });