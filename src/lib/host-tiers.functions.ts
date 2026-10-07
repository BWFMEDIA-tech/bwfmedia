import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Signed-in host: tier, totals, room history, next-tier progress. */
export const getMyHostEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const [{ data: rate }, { data: tiers }, { data: rows }, { data: streams }, { data: refs }, { data: comms }] = await Promise.all([
      sb.rpc("get_host_rate", { _user_id: context.userId }),
      sb.from("host_tiers").select("*").eq("active", true).order("rank"),
      sb.from("room_host_earnings").select("*").eq("host_id", context.userId).order("calculated_at", { ascending: false }).limit(100),
      sb.from("streams").select("id,status,title").eq("host_id", context.userId),
      sb.from("host_referrals").select("id,source").eq("host_id", context.userId),
      sb.from("host_referral_commissions").select("commission_cents,status").eq("host_id", context.userId),
    ]);
    const myTier = (tiers ?? []).find((t: any) => t.slug === (Array.isArray(rate) ? rate[0] : rate)?.tier_slug);
    const referrals = {
      percentage: Number(myTier?.referral_percentage ?? 0),
      signups: (refs ?? []).length,
      from_link: (refs ?? []).filter((r: any) => r.source === "link").length,
      from_live: (refs ?? []).filter((r: any) => r.source === "live_room").length,
      earned_cents: (comms ?? []).filter((c: any) => c.status !== "reversed").reduce((a: number, c: any) => a + Number(c.commission_cents), 0),
    };
    const r = Array.isArray(rate) ? rate[0] : rate;
    const list = (rows ?? []) as any[];
    const sum = (f: (x: any) => boolean, k = "host_amount_cents") =>
      list.filter(f).reduce((a, x) => a + Number(x[k] ?? 0), 0);
    const completed = list.filter((x) => x.status !== "reversed").length;
    const pool = sum((x) => x.status !== "reversed", "eligible_pool_cents");
    const current = (tiers ?? []).find((t: any) => t.slug === r?.tier_slug);
    const next = (tiers ?? []).find((t: any) => !t.is_custom && current && t.rank > current.rank);
    const titles = new Map((streams ?? []).map((s: any) => [s.id, s.title]));
    return {
      tier: { slug: r?.tier_slug ?? "standard", name: r?.tier_name ?? "Standard Host", percentage: Number(r?.percentage ?? 10), status: r?.status ?? "active" },
      tiers: tiers ?? [],
      referrals,
      next: next ? { name: next.name, percentage: Number(next.percentage), minimum_rooms: next.minimum_rooms, minimum_revenue_cents: Number(next.minimum_revenue_cents) } : null,
      totals: {
        rooms_hosted: (streams ?? []).length,
        active_rooms: (streams ?? []).filter((s: any) => s.status === "live").length,
        completed_rooms: completed,
        eligible_pool_cents: pool,
        pending_cents: sum((x) => x.status === "pending"),
        available_cents: sum((x) => x.status === "available"),
        frozen_cents: sum((x) => x.status === "frozen"),
        lifetime_cents: sum((x) => ["pending", "available", "paid"].includes(x.status)),
      },
      rooms: list.map((x) => ({ ...x, title: titles.get(x.stream_id) ?? "Live room" })),
    };
  });

/** Host-only live estimate for a room. */
export const getRoomHostEstimate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ streamId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).rpc("get_room_host_estimate", { _stream_id: data.streamId });
    if (error) return null;
    return res as { final: boolean; tier_slug: string; tier_name?: string; percentage: number; eligible_pool_cents: number; host_amount_cents: number; status: string };
  });

async function ensureAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListHosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const sb: any = context.supabase;
    const [{ data: earnings }, { data: profiles }, { data: tiers }, { data: history }] = await Promise.all([
      sb.from("room_host_earnings").select("*").order("calculated_at", { ascending: false }).limit(500),
      sb.from("host_profiles").select("*"),
      sb.from("host_tiers").select("*").order("rank"),
      sb.from("host_tier_history").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const ids = new Set<string>([...(earnings ?? []).map((e: any) => e.host_id), ...(profiles ?? []).map((p: any) => p.user_id)]);
    const { data: names } = ids.size
      ? await sb.from("public_profiles").select("id,display_name,username").in("id", [...ids])
      : { data: [] };
    const nameMap = new Map((names ?? []).map((n: any) => [n.id, n.display_name || n.username || "Host"]));
    const tierById = new Map((tiers ?? []).map((t: any) => [t.id, t]));
    const hosts = [...ids].map((id) => {
      const p = (profiles ?? []).find((x: any) => x.user_id === id);
      const t: any = p ? tierById.get(p.tier_id) : (tiers ?? []).find((x: any) => x.slug === "standard");
      const mine = (earnings ?? []).filter((e: any) => e.host_id === id);
      return {
        id,
        name: nameMap.get(id) ?? id.slice(0, 8),
        tier_slug: t?.slug ?? "standard",
        tier_name: t?.name ?? "Standard Host",
        percentage: Number(p?.custom_percentage ?? t?.percentage ?? 10),
        status: p?.status ?? "active",
        rooms: mine.length,
        pool_cents: mine.reduce((a: number, e: any) => a + Number(e.eligible_pool_cents), 0),
        earned_cents: mine.filter((e: any) => e.status !== "reversed").reduce((a: number, e: any) => a + Number(e.host_amount_cents), 0),
      };
    });
    return { hosts, tiers: tiers ?? [], earnings: earnings ?? [], history: history ?? [], nameMap: Object.fromEntries(nameMap) };
  });

export const adminAssignHostTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ hostId: z.string().uuid(), tierSlug: z.string().min(1), customPercentage: z.number().min(0).max(100).nullable(), reason: z.string().trim().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).rpc("assign_host_tier", {
      _host_id: data.hostId, _tier_slug: data.tierSlug, _custom_percentage: data.customPercentage, _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return res;
  });

export const adminSetHostStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ hostId: z.string().uuid(), status: z.enum(["active", "frozen"]), reason: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("set_host_status", { _host_id: data.hostId, _status: data.status, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminReverseHostEarning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ earningId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("reverse_host_earning", { _earning_id: data.earningId, _reason: data.reason });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), percentage: z.number().min(0).max(100), minimum_rooms: z.number().int().min(0), minimum_revenue_cents: z.number().int().min(0) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...patch } = data;
    const { error } = await (context.supabase as any).from("host_tiers").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
