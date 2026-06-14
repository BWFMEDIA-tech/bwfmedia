import { createServerFn } from "@tanstack/react-start";

export const getArtistMerch = createServerFn({ method: "GET" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin
      .from("shopify_stores")
      .select("shop_domain, shop_name, currency")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!store) return { store: null, products: [] as any[] };

    const { data: products } = await supabaseAdmin
      .from("merch_products")
      .select(`
        id, title, handle, image_url, min_price_cents, max_price_cents, currency,
        total_inventory, is_featured,
        variants:merch_variants(id, shopify_variant_id, title, price_cents, available, option1, option2)
      `)
      .eq("user_id", data.userId)
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(24);
    return { store, products: products ?? [] };
  });

export const getTrendingMerch = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("merch_products")
    .select(`
      id, title, image_url, min_price_cents, max_price_cents, currency, user_id,
      store:shopify_stores(shop_domain, shop_name),
      variants:merch_variants(shopify_variant_id, available)
    `)
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(12);
  return { products: data ?? [] };
});