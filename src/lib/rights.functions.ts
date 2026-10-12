import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const adminListRights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [regs, disputes] = await Promise.all([
      sb.from("rights_registrations").select("*").neq("status", "not_started").order("updated_at", { ascending: false }).limit(200),
      sb.from("rights_disputes").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const ids = Array.from(new Set([...(regs.data ?? []), ...(disputes.data ?? [])].map((r: any) => r.user_id)));
    const { data: profiles } = ids.length ? await sb.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
    const names = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    return { registrations: regs.data ?? [], disputes: disputes.data ?? [], names };
  });

export const adminSetRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["in_progress", "submitted", "verified", "issue"]), note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("rights_registrations").update({ status: data.status, admin_note: data.note ?? null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit({ actorId: context.userId, action: "rights.registration_status", category: "admin", targetType: "rights_registration", targetId: data.id, summary: `Set status to ${data.status}`, metadata: { note: data.note ?? null } });
    return { ok: true };
  });

export const adminSetDisputeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["open", "under_review", "resolved", "closed"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("rights_disputes").update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logAudit } = await import("./audit.server");
    await logAudit({ actorId: context.userId, action: "rights.dispute_status", category: "moderation", targetType: "rights_dispute", targetId: data.id, summary: `Set dispute to ${data.status}` });
    return { ok: true };
  });

export const getRightsIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getIntegrationStatus } = await import("./rights-integrations.server");
    return (["copyright_office", "ascap", "bmi", "songtrust", "soundexchange", "mlc"] as const).map(getIntegrationStatus);
  });
