// @auth-exempt: admin-only fn; verifies has_role("admin") inside handler before any privileged work.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListMerchStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stores } = await supabaseAdmin
      .from("shopify_stores")
      .select("id, user_id, shop_domain, shop_name, currency, connected_at, last_synced_at")
      .order("connected_at", { ascending: false });
    const ids = (stores ?? []).map((s) => s.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, stage_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return { stores: (stores ?? []).map((s) => ({ ...s, profile: map.get(s.user_id) ?? null })) };
  });

export const adminListCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("merch_commissions")
      .select("id, user_id, store_id, shopify_order_id, order_number, order_total_cents, commission_rate, commission_cents, artist_tier, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, stage_name").in("id", ids)
      : { data: [] as any[] };
    const totals = (rows ?? []).reduce(
      (acc, r) => {
        acc.gross += r.order_total_cents;
        acc.commission += r.commission_cents;
        acc.orders += 1;
        return acc;
      },
      { gross: 0, commission: 0, orders: 0 },
    );
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return {
      commissions: (rows ?? []).map((r) => ({ ...r, profile: map.get(r.user_id) ?? null })),
      totals,
    };
  });

export const adminTogglePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; published: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("merch_products")
      .update({ is_published: data.published } as any)
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminMarkCommissionPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { commissionId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("merch_commissions")
      .update({ status: "paid" } as any)
      .eq("id", data.commissionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });