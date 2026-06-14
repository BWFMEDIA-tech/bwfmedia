import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/admin-guard";

export const getSectionStats = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const [
      artists, videos, recordings, bookings, tipsPaid, commissionsAll, commissionsUnpaid,
      messages, profilesAll, bans, suppressed, audit,
    ] = await Promise.all([
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "artist"),
      sb.from("videos").select("id", { count: "exact", head: true }),
      sb.from("stream_recordings").select("id", { count: "exact", head: true }),
      sb.from("studio_bookings").select("id", { count: "exact", head: true }),
      sb.from("tips").select("amount_cents,created_at,status,user_id").eq("status", "paid").order("created_at", { ascending: false }).limit(10),
      sb.from("merch_commissions").select("commission_cents,paid_at"),
      sb.from("merch_commissions").select("commission_cents,artist_id,created_at").is("paid_at", null).order("created_at", { ascending: false }).limit(20),
      sb.from("direct_messages").select("id", { count: "exact", head: true }),
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("user_bans").select("id", { count: "exact", head: true }),
      sb.from("suppressed_emails").select("email", { count: "exact", head: true }),
      sb.from("admin_audit_log").select("id", { count: "exact", head: true }),
    ]);

    const sum = (rows: any[] | null, f: string) => (rows ?? []).reduce((a: number, r: any) => a + (r[f] || 0), 0);

    return {
      artistsCount: artists.count ?? 0,
      videosCount: videos.count ?? 0,
      recordingsCount: recordings.count ?? 0,
      bookingsCount: bookings.count ?? 0,
      tipsRecent: tipsPaid.data ?? [],
      tipsRevenueCents: sum(tipsPaid.data, "amount_cents"),
      commissionsTotalCents: sum(commissionsAll.data, "commission_cents"),
      commissionsPaidCents: sum((commissionsAll.data ?? []).filter((r: any) => r.paid_at), "commission_cents"),
      commissionsUnpaid: commissionsUnpaid.data ?? [],
      messagesCount: messages.count ?? 0,
      profilesCount: profilesAll.count ?? 0,
      bansCount: bans.count ?? 0,
      suppressedCount: suppressed.count ?? 0,
      auditCount: audit.count ?? 0,
    };
  });