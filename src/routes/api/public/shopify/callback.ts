// @public-endpoint: external callers (webhook / OAuth callback / cron). Caller is verified inside the handler via signature / shared secret / Stripe-session lookup.
import { createFileRoute } from "@tanstack/react-router";
import {
  exchangeCodeForToken,
  fetchAllProducts,
  fetchShopInfo,
  normalizeShopDomain,
  toCents,
  verifyOAuthHmac,
  getShopifyCreds,
  registerWebhooks,
} from "@/lib/shopify.server";

export const Route = createFileRoute("/api/public/shopify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const params = url.searchParams;
        const shop = normalizeShopDomain(params.get("shop") ?? "");
        const code = params.get("code");
        const state = params.get("state");
        if (!shop || !code || !state) return new Response("Missing required params", { status: 400 });

        const { secret } = getShopifyCreds();
        if (!verifyOAuthHmac(params, secret)) return new Response("Invalid HMAC", { status: 401 });

        // state = `${userId}.${nonce}` — also verify cookie nonce match
        const cookie = request.headers.get("cookie") ?? "";
        const cookieState = cookie.match(/shopify_oauth_state=([^;]+)/)?.[1];
        if (!cookieState || cookieState !== state) return new Response("State mismatch", { status: 401 });
        const [userId] = state.split(".");
        if (!userId) return new Response("Invalid state", { status: 400 });

        const { access_token, scope } = await exchangeCodeForToken(shop, code);
        const info = await fetchShopInfo(shop, access_token).catch(() => null);

        // Register webhooks (best-effort, idempotent — Shopify returns 422 for duplicates)
        registerWebhooks(shop, access_token, url.origin).catch((e) =>
          console.error("[shopify] webhook registration error", e),
        );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: storeRow, error: storeErr } = await supabaseAdmin
          .from("shopify_stores")
          .upsert(
            {
              user_id: userId,
              shop_domain: shop,
              scope,
              shop_name: info?.name ?? null,
              shop_email: info?.email ?? null,
              currency: info?.currency ?? null,
              connected_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            } as any,
            { onConflict: "shop_domain" },
          )
          .select("id")
          .single();

        if (storeErr || !storeRow) {
          console.error("[shopify] store upsert failed", storeErr);
          return new Response("Failed to save store", { status: 500 });
        }

        // Store the OAuth access token in the server-only credentials table
        const { error: credErr } = await supabaseAdmin
          .from("shopify_store_credentials" as any)
          .upsert(
            { store_id: storeRow.id, access_token, updated_at: new Date().toISOString() } as any,
            { onConflict: "store_id" },
          );
        if (credErr) {
          console.error("[shopify] credential upsert failed", credErr);
          return new Response("Failed to save credentials", { status: 500 });
        }

        // Initial product sync (best-effort)
        try {
          const products = await fetchAllProducts(shop, access_token);
          for (const p of products) {
            const prices = p.variants.map((v) => toCents(v.price)).filter((n) => n > 0);
            const totalInv = p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0);
            const { data: prod } = await supabaseAdmin
              .from("merch_products")
              .upsert(
                {
                  store_id: storeRow.id,
                  user_id: userId,
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
                  currency: info?.currency ?? "USD",
                  total_inventory: totalInv,
                  is_published: p.status === "active",
                } as any,
                { onConflict: "store_id,shopify_product_id" },
              )
              .select("id")
              .single();
            if (!prod) continue;
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
        } catch (err) {
          console.error("[shopify] initial sync failed", err);
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/settings/merch?connected=1",
            "Set-Cookie": "shopify_oauth_state=; Path=/; Max-Age=0",
          },
        });
      },
    },
  },
});