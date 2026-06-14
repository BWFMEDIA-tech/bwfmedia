import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin-guard";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Aggregated dashboard data — admin-only. Hides cards we can't populate. */
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const sincePrev30 = new Date(Date.now() - 60 * 86_400_000).toISOString();

    const [
      users, usersPrev,
      streamsLive, streamsTotal,
      tipsPaid, tipsPrev,
      merchCommissions, merchPrev,
      streamsRecent,
      topArtistRoles,
      recentAudit,
      activeBans,
    ] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since30),
      sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sincePrev30).lt("created_at", since30),
      sb.from("streams").select("id", { count: "exact", head: true }).eq("status", "live"),
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("tips").select("amount_cents,created_at").eq("status", "paid"),
      sb.from("tips").select("amount_cents").eq("status", "paid").gte("created_at", sincePrev30).lt("created_at", since30),
      sb.from("merch_commissions").select("order_total_cents,commission_cents,paid_at,created_at"),
      sb.from("merch_commissions").select("order_total_cents").gte("created_at", sincePrev30).lt("created_at", since30),
      sb.from("streams").select("id,title,host_id,started_at,viewer_count,status").order("started_at", { ascending: false, nullsFirst: false }).limit(5),
      sb.from("user_roles").select("user_id").eq("role", "artist").limit(50),
      sb.from("admin_audit_log").select("action,summary,actor_email,created_at").order("created_at", { ascending: false }).limit(6),
      sb.from("user_bans").select("id", { count: "exact", head: true }),
    ]);

    const sum = (rows: any[] | null, f: string) => (rows ?? []).reduce((a: number, r: any) => a + (r[f] || 0), 0);
    const tipsTotal = sum(tipsPaid.data, "amount_cents");
    const tipsLast30 = sum((tipsPaid.data ?? []).filter((r: any) => r.created_at >= since30), "amount_cents");
    const tipsPrev30 = sum(tipsPrev.data, "amount_cents");
    const merchTotal = sum(merchCommissions.data, "order_total_cents");
    const merchPrevTotal = sum(merchPrev.data, "order_total_cents");
    const merchCount = (merchCommissions.data ?? []).length;

    // Resolve host names for streamsRecent + top artists by stream count
    const hostIds = Array.from(new Set((streamsRecent.data ?? []).map((s: any) => s.host_id).filter(Boolean)));
    const artistIds = Array.from(new Set((topArtistRoles.data ?? []).map((r: any) => r.user_id)));
    const allIds = Array.from(new Set([...hostIds, ...artistIds]));
    const profilesRes = allIds.length
      ? await sb.from("profiles").select("id,display_name,stage_name,avatar_url").in("id", allIds)
      : { data: [] };
    const pmap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

    // Count streams per artist for "top artists"
    let topArtists: any[] = [];
    if (artistIds.length) {
      const counts = await sb.from("streams").select("host_id").in("host_id", artistIds);
      const tally = new Map<string, number>();
      (counts.data ?? []).forEach((s: any) => tally.set(s.host_id, (tally.get(s.host_id) ?? 0) + 1));
      topArtists = artistIds
        .map((id) => ({ id, streams: tally.get(id) ?? 0, profile: pmap.get(id) }))
        .sort((a, b) => b.streams - a.streams)
        .slice(0, 4);
    }

    const totalRevenue = tipsTotal + merchTotal;
    const totalRevenuePrev = tipsPrev30 + merchPrevTotal;

    const pct = (curr: number, prev: number) => {
      if (!prev) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    return {
      cards: {
        totalUsers: { value: streamsTotal.count ?? 0, delta: pct(users.count ?? 0, usersPrev.count ?? 0) },
        liveStreams: { value: streamsLive.count ?? 0 },
        totalRevenueCents: { value: totalRevenue, delta: pct(tipsLast30 + merchTotal, totalRevenuePrev) },
        merchSales: { value: merchCount, delta: pct(merchTotal, merchPrevTotal) },
      },
      topShows: (streamsRecent.data ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        viewerCount: s.viewer_count ?? 0,
        host: pmap.get(s.host_id) ?? null,
        status: s.status,
      })),
      topArtists,
      recentActivity: (recentAudit.data ?? []).map((a: any) => ({
        action: a.action, summary: a.summary, actor: a.actor_email, at: a.created_at,
      })),
      moderation: { activeBans: activeBans.count ?? 0 },
    };
  });

/** Admin profile — name, email, bio, etc. Returns own profile + last 30d audit count. */
export const getAdminProfile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const uid = context.userId;
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [profile, authUser, actions30, recentActions] = await Promise.all([
      sb.from("profiles").select("*").eq("id", uid).maybeSingle(),
      sb.auth.admin.getUserById(uid),
      sb.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("actor_id", uid).gte("created_at", since30),
      sb.from("admin_audit_log").select("action,summary,created_at").eq("actor_id", uid).order("created_at", { ascending: false }).limit(5),
    ]);

    return {
      profile: profile.data,
      email: authUser.data?.user?.email ?? null,
      lastSignInAt: authUser.data?.user?.last_sign_in_at ?? null,
      createdAt: authUser.data?.user?.created_at ?? null,
      actionsLast30Days: actions30.count ?? 0,
      recentActions: recentActions.data ?? [],
    };
  });

/** Update own admin profile (display_name, bio, avatar_url). */
export const updateAdminProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { display_name?: string; bio?: string; avatar_url?: string }) => d)
  .handler(async ({ data, context }) => {
    const updates: Record<string, unknown> = {};
    if (typeof data.display_name === "string") updates.display_name = data.display_name.slice(0, 80);
    if (typeof data.bio === "string") updates.bio = data.bio.slice(0, 500);
    if (typeof data.avatar_url === "string") updates.avatar_url = data.avatar_url.slice(0, 1000);
    if (!Object.keys(updates).length) return { ok: true };
    const { error } = await context.supabase.from("profiles").update(updates).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });