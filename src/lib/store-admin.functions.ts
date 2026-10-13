import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_ARTIST_BPS, REVIEW_STATUSES, SHIPPING_REGIONS, STORE_CATEGORIES } from "@/lib/artist-store";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}
async function audit(ctx: any, action: string, targetType: string, targetId: string | null, summary: string, metadata: Record<string, unknown>) {
  const { logAudit } = await import("@/lib/audit.server");
  await logAudit({ actorId: ctx.userId, actorEmail: (ctx.claims as any)?.email ?? null, action, category: "admin", targetType, targetId, summary, metadata });
}

export const adminStoreOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const [{ data: products }, { data: variants }, { data: rules }, { data: split }, { data: orders }, { data: ledger }, { data: log }] = await Promise.all([
      sb.from("store_products").select("id, user_id, title, product_type, price_cents, cost_cents, inventory, min_quantity, made_to_order, status, review_status, reviewed_at, updated_at").neq("status", "archived").order("updated_at", { ascending: false }).limit(500),
      sb.from("store_product_variants").select("id, product_id, label, price_cents, cost_cents, inventory, active").order("sort"),
      sb.from("store_shipping_rules").select("*"),
      sb.from("store_revenue_settings").select("*").eq("id", 1).maybeSingle(),
      sb.from("store_orders").select("id, product_title, variant_label, seller_user_id, buyer_email, quantity, unit_price_cents, shipping_cents, amount_total_cents, fee_cents, currency, status, fulfillment_status, tracking_number, carrier, environment, created_at").order("created_at", { ascending: false }).limit(500),
      sb.from("store_earnings_ledger").select("order_id, entry_type, artist_cents, platform_cents, revenue_cents, environment"),
      sb.from("admin_audit_log").select("id, actor_email, action, summary, created_at").like("action", "store.%").order("created_at", { ascending: false }).limit(100),
    ]);
    const ids = [...new Set([...(products ?? []).map((p: any) => p.user_id), ...(orders ?? []).map((o: any) => o.seller_user_id)])];
    const { data: profs } = ids.length ? await sb.from("profiles").select("id, display_name, username").in("id", ids) : { data: [] };
    const names: Record<string, string> = {};
    for (const p of profs ?? []) names[p.id] = p.display_name || p.username || "";
    return {
      products: products ?? [], variants: variants ?? [], rules: rules ?? [], artistBps: (split?.artist_bps ?? DEFAULT_ARTIST_BPS) as number,
      orders: orders ?? [], ledger: ledger ?? [], log: log ?? [], names,
    };
  });

export const adminReviewProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    productId: z.string().uuid(),
    price_cents: z.number().int().min(0).max(10_000_000),
    cost_cents: z.number().int().min(0).max(10_000_000).nullable(),
    min_quantity: z.number().int().min(1).max(10),
    inventory: z.number().int().min(0).max(1_000_000),
    made_to_order: z.boolean(),
    review_status: z.enum(REVIEW_STATUSES),
    archive: z.boolean().optional().default(false),
    variantCosts: z.array(z.object({ id: z.string().uuid(), price_cents: z.number().int().min(0).max(10_000_000), cost_cents: z.number().int().min(0).max(10_000_000).nullable() })).max(50).optional().default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const { data: before } = await sb.from("store_products").select("*").eq("id", data.productId).maybeSingle();
    if (!before) return { error: "Product not found" };
    if (data.review_status === "approved") {
      if (data.price_cents < 50) return { error: "Set a selling price of at least $0.50 before approving." };
      if (data.cost_cents == null) return { error: "Enter the actual production cost before approving." };
      const { categoryOf } = await import("@/lib/artist-store");
      const { data: rule } = await sb.from("store_shipping_rules").select("id").eq("category", categoryOf(before.product_type)).eq("active", true).limit(1);
      if (!rule?.length) return { error: "Add a shipping rule for this category before approving." };
      if (!before.title || !(before.image_urls ?? []).length) return { error: "The product needs a title and at least one photo before approval." };
    }
    for (const v of data.variantCosts) {
      if (data.review_status === "approved" && v.price_cents < 50) return { error: "Every option needs a price of at least $0.50." };
      await sb.from("store_product_variants").update({ price_cents: v.price_cents, cost_cents: v.cost_cents }).eq("id", v.id).eq("product_id", data.productId);
    }
    const patch: any = {
      price_cents: data.price_cents, cost_cents: data.cost_cents, min_quantity: data.min_quantity, inventory: data.inventory,
      made_to_order: data.made_to_order, review_status: data.review_status, updated_at: new Date().toISOString(),
    };
    if (data.review_status === "approved" && before.review_status !== "approved") { patch.reviewed_by = context.userId; patch.reviewed_at = new Date().toISOString(); }
    if (data.archive) patch.status = "archived";
    const { error } = await sb.from("store_products").update(patch).eq("id", data.productId);
    if (error) return { error: error.message };
    await audit(context, data.archive ? "store.product.archive" : `store.product.${data.review_status}`, "store_product", data.productId,
      `${before.title}: ${before.review_status} → ${data.review_status}`, {
        before: { price_cents: before.price_cents, cost_cents: before.cost_cents, review_status: before.review_status, inventory: before.inventory },
        after: patch, variants: data.variantCosts,
      });
    return { error: null as string | null };
  });

export const adminSaveShippingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    category: z.enum(STORE_CATEGORIES), region: z.enum(SHIPPING_REGIONS),
    first_item_cents: z.number().int().min(0).max(100000), additional_item_cents: z.number().int().min(0).max(100000), active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).from("store_shipping_rules")
      .upsert({ ...data, updated_by: context.userId, updated_at: new Date().toISOString() }, { onConflict: "category,region" });
    if (error) return { error: error.message };
    await audit(context, "store.shipping.save", "store_shipping_rule", null, `${data.category}/${data.region}`, data);
    return { error: null as string | null };
  });

export const adminSaveSplit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ artist_bps: z.number().int().min(0).max(10000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase as any;
    const { data: before } = await sb.from("store_revenue_settings").select("artist_bps").eq("id", 1).maybeSingle();
    const { error } = await sb.from("store_revenue_settings").upsert({ id: 1, artist_bps: data.artist_bps, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) return { error: error.message };
    await audit(context, "store.split.save", "store_revenue_settings", "1", `Artist share ${(before?.artist_bps ?? DEFAULT_ARTIST_BPS) / 100}% → ${data.artist_bps / 100}%`, { before: before?.artist_bps ?? null, after: data.artist_bps });
    return { error: null as string | null };
  });
