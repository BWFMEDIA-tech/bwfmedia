import { createHmac, timingSafeEqual, randomBytes } from "crypto";

export const SHOPIFY_SCOPES = "read_products,read_inventory,read_orders,read_customers";

export function getShopifyCreds() {
  const key = process.env.SHOPIFY_API_KEY;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!key || !secret) throw new Error("Shopify API credentials not configured");
  return { key, secret };
}

export function normalizeShopDomain(input: string): string | null {
  const v = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v)) return null;
  return v;
}

// Shopify HMAC for OAuth install callback: hex digest over sorted query string (excluding `hmac` and `signature`).
export function verifyOAuthHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get("hmac");
  if (!hmac) return false;
  const entries: [string, string][] = [];
  params.forEach((value, key) => {
    if (key !== "hmac" && key !== "signature") entries.push([key, value]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  const message = entries.map(([k, v]) => `${k}=${v}`).join("&");
  const digest = createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(hmac, "hex");
  const b = Buffer.from(digest, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Webhook HMAC: base64 over raw body using SHOPIFY_API_SECRET.
export function verifyWebhookHmac(rawBody: string, headerHmac: string | null, secret: string): boolean {
  if (!headerHmac) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(headerHmac);
  const b = Buffer.from(digest);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

export async function exchangeCodeForToken(shop: string, code: string) {
  const { key, secret } = getShopifyCreds();
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: key, client_secret: secret, code }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return (await res.json()) as { access_token: string; scope: string };
}

export async function shopifyRest(shop: string, token: string, path: string) {
  const res = await fetch(`https://${shop}/admin/api/2024-10/${path}`, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Shopify REST ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchShopInfo(shop: string, token: string) {
  const j = await shopifyRest(shop, token, "shop.json");
  return j.shop as { name: string; email: string; currency: string };
}

export async function fetchAllProducts(shop: string, token: string) {
  const j = await shopifyRest(shop, token, "products.json?limit=250&status=active");
  return j.products as ShopifyProduct[];
}

export async function registerWebhooks(shop: string, token: string, origin: string) {
  const topics = ["products/update", "products/create", "products/delete", "inventory_levels/update", "orders/paid", "orders/create"];
  const address = `${origin}/api/public/shopify/webhook`;
  for (const topic of topics) {
    await fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ webhook: { topic, address, format: "json" } }),
    }).catch((e) => console.error(`[shopify] webhook ${topic} register failed`, e));
  }
}

export interface ShopifyVariant {
  id: number; title: string; sku: string; price: string; compare_at_price: string | null;
  inventory_quantity: number; option1: string | null; option2: string | null; option3: string | null;
  image_id: number | null;
}
export interface ShopifyProduct {
  id: number; handle: string; title: string; body_html: string; vendor: string; product_type: string;
  tags: string; status: string; image: { src: string } | null;
  images: { id: number; src: string }[]; variants: ShopifyVariant[];
}

export function toCents(price: string): number {
  const f = parseFloat(price);
  return Math.round((isFinite(f) ? f : 0) * 100);
}