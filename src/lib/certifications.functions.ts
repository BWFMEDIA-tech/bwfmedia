import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard";
import { CERT_LEVELS } from "@/lib/certifications";

async function loadDashboard(sb: any, artistId: string) {
  const [profile, streams, certs] = await Promise.all([
    sb.from("profiles").select("id, display_name, stage_name, avatar_url").eq("id", artistId).maybeSingle(),
    sb.rpc("get_certification_streams", { _artist_id: artistId }),
    sb.from("artist_certifications").select("*").eq("artist_id", artistId).order("achieved_at", { ascending: true }),
  ]);
  if (streams.error) throw new Error("Certification data is not available for this account");
  if (!profile.data) throw new Error("Artist not found");
  return { profile: profile.data, streams: Number(streams.data ?? 0), certifications: certs.data ?? [] };
}

/** Artists can only read their own dashboard; RLS + RPC also enforce this. */
export const getMyCertificationDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadDashboard(context.supabase, context.userId));

export const adminGetCertificationDashboard = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { artistId: string }) => z.object({ artistId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const dash = await loadDashboard((context as any).supabase, data.artistId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: history } = await (supabaseAdmin as any).from("admin_audit_log")
      .select("action, summary, actor_email, created_at").eq("target_type", "artist_certification").eq("target_id", data.artistId)
      .order("created_at", { ascending: false }).limit(100);
    return { ...dash, history: history ?? [] };
  });

export const adminSearchCertificationArtists = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().trim().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data: roles } = await sb.from("user_roles").select("user_id").eq("role", "artist").limit(5000);
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (!ids.length) return [];
    let q = sb.from("profiles").select("id, display_name, stage_name, avatar_url").in("id", ids).limit(25);
    if (data.q) {
      const s = data.q.replace(/[%,()]/g, "");
      q = q.or(`stage_name.ilike.%${s}%,display_name.ilike.%${s}%`);
    }
    const { data: rows } = await q;
    return rows ?? [];
  });

const actionSchema = z.object({
  artistId: z.string().uuid(),
  level: z.enum(CERT_LEVELS.map((l) => l.key) as [string, ...string[]]),
  action: z.enum(["issue", "revoke", "correct"]),
  note: z.string().trim().max(1000).default(""),
  achievedAt: z.string().datetime().optional(),
  override: z.boolean().default(false),
});

export const adminCertificationAction = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: z.input<typeof actionSchema>) => actionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    const sb = supabaseAdmin as any;
    const { data: streams, error } = await sb.rpc("get_certification_streams", { _artist_id: data.artistId });
    if (error) throw new Error("Could not verify stream totals");
    const total = Number(streams ?? 0);
    const level = CERT_LEVELS.find((l) => l.key === data.level)!;
    const now = new Date().toISOString();
    if (data.action === "issue") {
      if (total < level.threshold && !data.override) throw new Error(`Verified streams (${total.toLocaleString()}) are below the ${level.label} threshold`);
      if (total < level.threshold && !data.note) throw new Error("A note is required when overriding the stream threshold");
      const { error: e } = await sb.from("artist_certifications").upsert({
        artist_id: data.artistId, level: data.level, status: "issued", eligible_streams_at_issue: total,
        achieved_at: data.achievedAt ?? now, issued_by: ctx.userId, revoked_at: null, revoked_by: null, note: data.note || null, updated_at: now,
      }, { onConflict: "artist_id,level" });
      if (e) throw new Error(e.message);
    } else {
      const { data: existing } = await sb.from("artist_certifications").select("id").eq("artist_id", data.artistId).eq("level", data.level).maybeSingle();
      if (!existing) throw new Error("This certification has not been issued");
      const patch = data.action === "revoke"
        ? { status: "revoked", revoked_at: now, revoked_by: ctx.userId, note: data.note || null, updated_at: now }
        : { ...(data.achievedAt ? { achieved_at: data.achievedAt } : {}), note: data.note || null, updated_at: now };
      if (data.action === "revoke" && !data.note) throw new Error("A reason is required to revoke");
      const { error: e } = await sb.from("artist_certifications").update(patch).eq("id", existing.id);
      if (e) throw new Error(e.message);
    }
    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.claims?.email ?? null, action: `certification.${data.action}`,
      targetType: "artist_certification", targetId: data.artistId,
      summary: `${data.action} ${level.label} (verified streams ${total.toLocaleString()})${data.note ? ` — ${data.note}` : ""}`,
      metadata: { level: data.level, streams: total, override: data.override },
    });
    return { ok: true };
  });
