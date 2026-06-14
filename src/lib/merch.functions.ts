import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyShopifyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: store } = await context.supabase
      .from("shopify_stores")
      .select("id, shop_domain, shop_name, currency, connected_at, last_synced_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!store) return { store: null, products: [] as any[] };
    const { data: products } = await context.supabase
      .from("merch_products")
      .select("id, title, image_url, min_price_cents, max_price_cents, currency, total_inventory, is_published, is_featured")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { store, products: products ?? [] };
  });

export const syncShopifyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin
      .from("shopify_stores")
      .select("id, shop_domain, access_token, currency")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!store) throw new Error("No connected store");

    const { fetchAllProducts, toCents } = await import("@/lib/shopify.server");
    const products = await fetchAllProducts(store.shop_domain, store.access_token);
    let count = 0;
    for (const p of products) {
      const prices = p.variants.map((v) => toCents(v.price)).filter((n) => n > 0);
      const totalInv = p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0);
      const { data: prod } = await supabaseAdmin
        .from("merch_products")
        .upsert(
          {
            store_id: store.id,
            user_id: context.userId,
            shopify_product_id: p.id,
            handle: p.handle,
            title: p.title,
            description: p.body_html?.replace(/<[^>]+>/g, "").slice(0, 1000) ?? null,
            vendor: p.vendor,
            product_type: p.product_type,
            tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            status: p.status,
            image_url: p.image?.src ?? p.images?.[0]?.src ?? null,
            min_price_cents: prices.length ? Math.min(...prices) : 0,
            max_price_cents: prices.length ? Math.max(...prices) : 0,
            currency: store.currency ?? "USD",
            total_inventory: totalInv,
            is_published: p.status === "active",
          } as any,
          { onConflict: "store_id,shopify_product_id" },
        )
        .select("id")
        .single();
      if (!prod) continue;
      count++;
      for (const v of p.variants) {
        await supabaseAdmin.from("merch_variants").upsert(
          {
            product_id: prod.id,
            shopify_variant_id: v.id,
            title: v.title,
            sku: v.sku,
            price_cents: toCents(v.price),
            compare_at_price_cents: v.compare_at_price ? toCents(v.compare_at_price) : null,
            inventory_quantity: v.inventory_quantity,
            available: (v.inventory_quantity ?? 0) > 0,
            option1: v.option1,
            option2: v.option2,
            option3: v.option3,
          } as any,
          { onConflict: "product_id,shopify_variant_id" },
        );
      }
    }
    await supabaseAdmin
      .from("shopify_stores")
      .update({ last_synced_at: new Date().toISOString() } as any)
      .eq("id", store.id);
    return { synced: count };
  });

export const disconnectShopifyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("shopify_stores").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const toggleProductFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; featured: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("merch_products")
      .update({ is_featured: data.featured } as any)
      .eq("id", data.productId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });