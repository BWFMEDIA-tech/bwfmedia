import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard";

/** Public: resolve /join/:code to a host and record a link visit. */
export const resolveJoinCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb: any = supabaseAdmin;
    const { data: row } = await sb.from("host_referral_codes").select("user_id").eq("code", data.code.toLowerCase()).maybeSingle();
    if (!row) return { hostId: null as string | null, hostName: null as string | null };
    const { data: isHost } = await sb.from("user_roles").select("role").eq("user_id", row.user_id).eq("role", "host").maybeSingle();
    if (!isHost) return { hostId: null, hostName: null };
    const [{ data: prof }] = await Promise.all([
      sb.from("profiles").select("display_name,username").eq("id", row.user_id).maybeSingle(),
      sb.from("artist_referral_clicks").insert({ host_id: row.user_id }),
    ]);
    return { hostId: row.user_id as string, hostName: (prof?.display_name || prof?.username || "a Tunevio host") as string };
  });

/** Host dashboard: artist referral stats, separate from room earnings. */
export const getMyArtistReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const uid = context.userId;
    const [{ data: code }, { data: settings }, { data: refs }, { data: comms }, { count: clicks }] = await Promise.all([
      sb.from("host_referral_codes").select("code").eq("user_id", uid).maybeSingle(),
      sb.from("artist_referral_settings").select("percentage,enabled").maybeSingle(),
      sb.from("artist_referrals").select("artist_id,created_at").eq("host_id", uid).order("created_at", { ascending: false }),
      sb.from("artist_referral_commissions").select("*").eq("host_id", uid).order("created_at", { ascending: false }).limit(200),
      sb.from("artist_referral_clicks").select("id", { count: "exact", head: true }).eq("host_id", uid),
    ]);
    const ids = (refs ?? []).map((r: any) => r.artist_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profs }, { data: subs }] = ids.length
      ? await Promise.all([
          (supabaseAdmin as any).from("profiles").select("id,display_name,username").in("id", ids),
          (supabaseAdmin as any).from("subscriptions").select("user_id,status,role").in("user_id", ids).eq("role", "artist"),
        ])
      : [{ data: [] }, { data: [] }];
    const active = new Set((subs ?? []).filter((s: any) => ["active", "trialing"].includes(s.status)).map((s: any) => s.user_id));
    const names = new Map((profs ?? []).map((p: any) => [p.id, p.display_name || p.username || "Artist"]));
    const list = (comms ?? []) as any[];
    const live = list.filter((c) => c.status !== "reversed");
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const earnedBy = new Map<string, number>();
    live.forEach((c) => earnedBy.set(c.artist_id, (earnedBy.get(c.artist_id) ?? 0) + Number(c.commission_cents)));
    return {
      code: code?.code ?? null,
      percentage: Number(settings?.percentage ?? 10),
      enabled: settings?.enabled ?? true,
      clicks: clicks ?? 0,
      referred: ids.length,
      active: active.size,
      monthly_cents: live.filter((c) => new Date(c.created_at) >= monthStart).reduce((a, c) => a + Number(c.commission_cents), 0),
      lifetime_cents: live.reduce((a, c) => a + Number(c.commission_cents), 0),
      pending_cents: list.filter((c) => c.status === "pending").reduce((a, c) => a + Number(c.commission_cents), 0),
      artists: (refs ?? []).map((r: any) => ({
        id: r.artist_id, name: names.get(r.artist_id) ?? "Artist", joined: r.created_at,
        active: active.has(r.artist_id), earned_cents: earnedBy.get(r.artist_id) ?? 0,
      })),
      commissions: list.map((c) => ({ ...c, artist_name: names.get(c.artist_id) ?? "Artist" })),
    };
  });

/** Admin: settings + all referral activity. */
export const adminGetArtistReferrals = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb: any = supabaseAdmin;
    const [{ data: settings }, { data: refs }, { data: comms }, { data: audit }] = await Promise.all([
      sb.from("artist_referral_settings").select("*").maybeSingle(),
      sb.from("artist_referrals").select("*").order("created_at", { ascending: false }).limit(500),
      sb.from("artist_referral_commissions").select("*").order("created_at", { ascending: false }).limit(500),
      sb.from("admin_audit_log").select("*").eq("target_type", "artist_referral").order("created_at", { ascending: false }).limit(100),
    ]);
    const ids = [...new Set([...(refs ?? []), ...(comms ?? [])].flatMap((r: any) => [r.host_id, r.artist_id]))];
    const { data: profs } = ids.length ? await sb.from("profiles").select("id,display_name,username").in("id", ids) : { data: [] };
    const names: Record<string, string> = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.display_name || p.username || p.id.slice(0, 8)]));
    return { settings, referrals: refs ?? [], commissions: comms ?? [], audit: audit ?? [], names };
  });

export const adminUpdateArtistReferralSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ percentage: z.number().min(0).max(100), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    const { error } = await (supabaseAdmin as any).from("artist_referral_settings")
      .update({ ...data, updated_by: context.userId, updated_at: new Date().toISOString() }).eq("id", true);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "artist_referral.settings", category: "payout", targetType: "artist_referral",
      summary: `Artist referral ${data.enabled ? "enabled" : "disabled"} at ${data.percentage}%`, metadata: data });
    return { ok: true };
  });

export const adminReverseArtistCommission = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    const { data: row, error } = await (supabaseAdmin as any).from("artist_referral_commissions")
      .update({ status: "reversed", reversed_by: context.userId, reversed_reason: data.reason, reversed_at: new Date().toISOString() })
      .eq("id", data.id).neq("status", "reversed").select("*").maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Commission not found or already reversed");
    await logAudit({ actorId: context.userId, action: "artist_referral.reverse", category: "payout", targetType: "artist_referral",
      targetId: data.id, summary: `Reversed $${(row.commission_cents / 100).toFixed(2)}: ${data.reason}`, metadata: row });
    return { ok: true };
  });
