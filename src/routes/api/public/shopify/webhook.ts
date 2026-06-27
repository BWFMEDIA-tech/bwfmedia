// @public-endpoint: external callers (webhook / OAuth callback / cron). Caller is verified inside the handler via signature / shared secret / Stripe-session lookup.
import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookHmac, getShopifyCreds, toCents } from "@/lib/shopify.server";

// Commission tiers — placeholder mapping until artist tier field exists.
const TIER_RATES: Record<string, number> = {
  basic: 0.05,
  featured: 0.03,
  premium: 0.01,
  vip: 0,
};

export const Route = createFileRoute("/api/public/shopify/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const topic = request.headers.get("x-shopify-topic") ?? "";
        const shop = request.headers.get("x-shopify-shop-domain") ?? "";
        const hmac = request.headers.get("x-shopify-hmac-sha256");
        const { secret } = getShopifyCreds();
        if (!verifyWebhookHmac(raw, hmac, secret)) {
          return new Response("Invalid HMAC", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: store } = await supabaseAdmin
          .from("shopify_stores")
          .select("id, user_id, currency")
          .eq("shop_domain", shop)
          .maybeSingle();
        if (!store) return new Response("Unknown shop", { status: 404 });

        const payload = JSON.parse(raw);

        if (topic === "products/update" || topic === "products/create") {
          const p = payload;
          const prices: number[] = (p.variants ?? []).map((v: any) => toCents(v.price)).filter((n: number) => n > 0);
          const totalInv = (p.variants ?? []).reduce((s: number, v: any) => s + (v.inventory_quantity ?? 0), 0);
          const { data: prod } = await supabaseAdmin
            .from("merch_products")
            .upsert({
              store_id: store.id, user_id: store.user_id,
              shopify_product_id: p.id, handle: p.handle, title: p.title,
              description: p.body_html?.replace(/<[^>]+>/g, "").slice(0, 1000) ?? null,
              vendor: p.vendor, product_type: p.product_type,
              tags: typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
              status: p.status, image_url: p.image?.src ?? p.images?.[0]?.src ?? null,
              min_price_cents: prices.length ? Math.min(...prices) : 0,
              max_price_cents: prices.length ? Math.max(...prices) : 0,
              currency: store.currency ?? "USD",
              total_inventory: totalInv, is_published: p.status === "active",
            } as any, { onConflict: "store_id,shopify_product_id" })
            .select("id").single();
          if (prod) {
            for (const v of p.variants ?? []) {
              await supabaseAdmin.from("merch_variants").upsert({
                product_id: prod.id, shopify_variant_id: v.id, title: v.title, sku: v.sku,
                price_cents: toCents(v.price),
                compare_at_price_cents: v.compare_at_price ? toCents(v.compare_at_price) : null,
                inventory_quantity: v.inventory_quantity,
                available: (v.inventory_quantity ?? 0) > 0,
                option1: v.option1, option2: v.option2, option3: v.option3,
              } as any, { onConflict: "product_id,shopify_variant_id" });
            }
          }
        } else if (topic === "products/delete") {
          await supabaseAdmin.from("merch_products").delete()
            .eq("store_id", store.id).eq("shopify_product_id", payload.id);
        } else if (topic === "inventory_levels/update") {
          // payload: { inventory_item_id, available, location_id }
          // Inventory items map to variants via /admin/api/.../variants.json?inventory_item_ids=...
          // For simplicity, mark variants stale; full reconciliation runs on next sync.
          await supabaseAdmin.from("shopify_stores").update({ last_synced_at: null } as any).eq("id", store.id);
        } else if (topic === "orders/paid" || topic === "orders/create") {
          const o = payload;
          const totalCents = toCents(o.total_price ?? "0");
          const tier = "basic"; // TODO: read artist tier when implemented
          const rate = TIER_RATES[tier] ?? 0.05;
          const commissionCents = Math.round(totalCents * rate);
          await supabaseAdmin.from("merch_commissions").upsert({
            user_id: store.user_id, store_id: store.id,
            shopify_order_id: o.id, order_number: String(o.order_number ?? o.name ?? o.id),
            order_total_cents: totalCents, commission_rate: rate,
            commission_cents: commissionCents, artist_tier: tier,
            currency: o.currency ?? store.currency ?? "USD",
            status: o.financial_status === "paid" ? "earned" : "pending",
          } as any, { onConflict: "store_id,shopify_order_id" });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});