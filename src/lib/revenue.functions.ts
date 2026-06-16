import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type DayPoint = { day: string; tips_cents: number; merch_cents: number; total_cents: number };
type RecentEvent = {
  id: string;
  kind: "tip" | "merch";
  amount_cents: number;
  label: string;
  created_at: string;
};

export const getArtistRevenue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Streams the user hosts (for tip attribution + realtime filter)
    const { data: myStreams } = await supabase
      .from("streams")
      .select("id, title")
      .eq("host_id", userId);
    const streamIds = (myStreams ?? []).map((s) => s.id);
    const streamTitleById = new Map<string, string>(
      (myStreams ?? []).map((s) => [s.id as string, (s.title as string) ?? "Stream"]),
    );

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Tips on the user's streams (paid only)
    let tips: Array<{
      id: string;
      amount_cents: number;
      stream_id: string | null;
      display_name: string | null;
      paid_at: string | null;
      created_at: string;
    }> = [];
    if (streamIds.length > 0) {
      const { data: tipsRows } = await supabase
        .from("tips")
        .select("id, amount_cents, stream_id, display_name, paid_at, created_at")
        .in("stream_id", streamIds)
        .eq("status", "paid")
        .gte("created_at", since30)
        .order("created_at", { ascending: false });
      tips = (tipsRows ?? []) as typeof tips;
    }

    // Merch commissions earned by the user
    const { data: commissionRows } = await supabase
      .from("merch_commissions")
      .select("id, commission_cents, order_number, status, created_at")
      .eq("user_id", userId)
      .neq("status", "refunded")
      .gte("created_at", since30)
      .order("created_at", { ascending: false });
    const commissions = (commissionRows ?? []) as Array<{
      id: string;
      commission_cents: number;
      order_number: string | null;
      status: string;
      created_at: string;
    }>;

    // All-time totals (lightweight aggregate queries)
    let allTimeTips = 0;
    if (streamIds.length > 0) {
      const { data: allTips } = await supabase
        .from("tips")
        .select("amount_cents")
        .in("stream_id", streamIds)
        .eq("status", "paid");
      allTimeTips = (allTips ?? []).reduce((s, r: any) => s + (r.amount_cents ?? 0), 0);
    }
    const { data: allCommissions } = await supabase
      .from("merch_commissions")
      .select("commission_cents")
      .eq("user_id", userId)
      .neq("status", "refunded");
    const allTimeMerch = (allCommissions ?? []).reduce(
      (s, r: any) => s + (r.commission_cents ?? 0),
      0,
    );

    // 24h totals
    const tips24h = tips
      .filter((t) => (t.paid_at ?? t.created_at) >= since24)
      .reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const merch24h = commissions
      .filter((c) => c.created_at >= since24)
      .reduce((s, r) => s + (r.commission_cents ?? 0), 0);

    // 30-day daily series
    const byDay = new Map<string, DayPoint>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      byDay.set(d, { day: d, tips_cents: 0, merch_cents: 0, total_cents: 0 });
    }
    for (const t of tips) {
      const d = (t.paid_at ?? t.created_at).slice(0, 10);
      const row = byDay.get(d);
      if (row) {
        row.tips_cents += t.amount_cents ?? 0;
        row.total_cents += t.amount_cents ?? 0;
      }
    }
    for (const c of commissions) {
      const d = c.created_at.slice(0, 10);
      const row = byDay.get(d);
      if (row) {
        row.merch_cents += c.commission_cents ?? 0;
        row.total_cents += c.commission_cents ?? 0;
      }
    }
    const daily: DayPoint[] = Array.from(byDay.values());

    // Recent activity (last 20 across both sources)
    const recent: RecentEvent[] = [
      ...tips.slice(0, 20).map<RecentEvent>((t) => ({
        id: `tip:${t.id}`,
        kind: "tip",
        amount_cents: t.amount_cents,
        label: `${t.display_name ?? "Someone"} tipped on ${streamTitleById.get(t.stream_id ?? "") ?? "your stream"}`,
        created_at: t.paid_at ?? t.created_at,
      })),
      ...commissions.slice(0, 20).map<RecentEvent>((c) => ({
        id: `merch:${c.id}`,
        kind: "merch",
        amount_cents: c.commission_cents,
        label: `Merch commission${c.order_number ? ` · order ${c.order_number}` : ""}`,
        created_at: c.created_at,
      })),
    ]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 20);

    return {
      totals: {
        all_time_cents: allTimeTips + allTimeMerch,
        tips_all_cents: allTimeTips,
        merch_all_cents: allTimeMerch,
        last_24h_cents: tips24h + merch24h,
        tips_24h_cents: tips24h,
        merch_24h_cents: merch24h,
      },
      daily,
      recent,
      streamIds,
    };
  });