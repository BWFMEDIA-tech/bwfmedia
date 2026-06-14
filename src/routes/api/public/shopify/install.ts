import { createFileRoute } from "@tanstack/react-router";
import { getShopifyCreds, normalizeShopDomain, newNonce, SHOPIFY_SCOPES } from "@/lib/shopify.server";

export const Route = createFileRoute("/api/public/shopify/install")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shop = normalizeShopDomain(url.searchParams.get("shop") ?? "");
        const userId = url.searchParams.get("user_id");
        if (!shop) return new Response("Invalid shop domain. Use yourstore.myshopify.com", { status: 400 });
        if (!userId) return new Response("Missing user_id", { status: 400 });

        const { key } = getShopifyCreds();
        const state = `${userId}.${newNonce()}`;
        const redirectUri = `${url.origin}/api/public/shopify/callback`;
        const authUrl =
          `https://${shop}/admin/oauth/authorize?client_id=${encodeURIComponent(key)}` +
          `&scope=${encodeURIComponent(SHOPIFY_SCOPES)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&state=${encodeURIComponent(state)}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: authUrl,
            "Set-Cookie": `shopify_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      },
    },
  },
});