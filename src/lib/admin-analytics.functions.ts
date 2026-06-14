import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin-guard";

export const getGlobalAnalytics = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [
      streamsLive,
      streamsTotal,
      streams30,
      tipsPaid,
      tips30,
      videosCount,
      recordingsCount,
      messages30,
      bookingsPaid,
      bansActive,
      rolesAll,
    ] = await Promise.all([
      sb.from("streams").select("id", { count: "exact", head: true }).eq("status", "live"),
      sb.from("streams").select("id", { count: "exact", head: true }),
      sb.from("streams").select("id", { count: "exact", head: true }).gte("created_at", since30),
      sb.from("tips").select("amount_cents").eq("status", "paid"),
      sb.from("tips").select("amount_cents").eq("status", "paid").gte("created_at", since30),
      sb.from("videos").select("id", { count: "exact", head: true }),
      sb.from("stream_recordings").select("id", { count: "exact", head: true }).eq("status", "ready"),
      sb.from("stream_messages").select("id", { count: "exact", head: true }).gte("created_at", since30),
      sb.from("studio_bookings").select("amount_paid_cents").not("paid_at", "is", null),
      sb.from("user_bans").select("id", { count: "exact", head: true }),
      sb.from("user_roles").select("role"),
    ]);

    const sumCents = (rows: any[] | null | undefined, field = "amount_cents") =>
      (rows ?? []).reduce((acc: number, r: any) => acc + (r[field] || 0), 0);

    const roleCounts: Record<string, number> = {};
    (rolesAll.data ?? []).forEach((r: any) => {
      roleCounts[r.role] = (roleCounts[r.role] ?? 0) + 1;
    });

    return {
      streams: {
        live: streamsLive.count ?? 0,
        total: streamsTotal.count ?? 0,
        last30Days: streams30.count ?? 0,
      },
      revenueCents: {
        tipsAllTime: sumCents(tipsPaid.data),
        tipsLast30Days: sumCents(tips30.data),
        studioBookings: sumCents(bookingsPaid.data, "amount_paid_cents"),
      },
      content: {
        videos: videosCount.count ?? 0,
        recordings: recordingsCount.count ?? 0,
        messagesLast30Days: messages30.count ?? 0,
      },
      community: {
        roleCounts,
        activeBans: bansActive.count ?? 0,
      },
    };
  });