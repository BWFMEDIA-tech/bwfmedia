import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRODUCT_TYPES, FULFILLMENT_STATUSES, checkPurchasable, isSafeNfcPath } from "@/lib/artist-store";
import { validateReturnUrl } from "@/lib/validate-return-url";

const BUCKET = "store-products";
const PRODUCT_COLS =
  "id, user_id, release_id, title, description, product_type, price_cents, currency, inventory, shipping_info, image_urls, status, is_featured, created_at";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function signImages<T extends { image_urls: string[] | null }>(client: any, rows: T[]): Promise<(T & { images: string[] })[]> {
  const paths = Array.from(new Set(rows.flatMap((r) => r.image_urls ?? [])));
  const map = new Map<string, string>();
  if (paths.length) {
    const { data } = await client.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    for (const d of data ?? []) if (d.signedUrl && d.path) map.set(d.path, d.signedUrl);
  }
  return rows.map((r) => ({ ...r, images: (r.image_urls ?? []).map((p) => map.get(p)).filter(Boolean) as string[] }));
}

async function attachArtists(client: any, rows: any[]) {
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (!ids.length) return rows.map((r) => ({ ...r, artist_name: null }));
  const { data } = await client.from("profiles").select("id, display_name").in("id", ids);
  const m = new Map((data ?? []).map((p: any) => [p.id, p.display_name]));
  return rows.map((r) => ({ ...r, artist_name: m.get(r.user_id) ?? null }));
}

// ---------- Public (fan) ----------
export const listStoreProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { artistId?: string } | undefined) =>
    z.object({ artistId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const c = publicClient();
    let q = c.from("store_products").select(PRODUCT_COLS).eq("status", "published").order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(200);
    if (data.artistId) q = q.eq("user_id", data.artistId);
    const { data: rows, error } = await q;
    if (error) return { products: [], error: "Store is unavailable right now." };
    return { products: await attachArtists(c, await signImages(c, rows ?? [])), error: null as string | null };
  });

export const getStoreProduct = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const c = publicClient();
    const { data: row } = await c.from("store_products").select(PRODUCT_COLS).eq("id", data.id).eq("status", "published").maybeSingle();
    if (!row) return { product: null };
    const [signed] = await attachArtists(c, await signImages(c, [row]));
    let release: { id: string; title: string } | null = null;
    if (row.release_id) {
      const { data: r } = await c.from("distribution_releases").select("id, title").eq("id", row.release_id).maybeSingle();
      release = r ?? null;
    }
    return { product: { ...signed, release } };
  });

// ---------- Artist management ----------
export const getMyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: products } = await sb.from("store_products").select(PRODUCT_COLS).eq("user_id", context.userId).order("created_at", { ascending: false });
    const { data: links } = await sb.from("store_nfc_links").select("*").eq("user_id", context.userId);
    const { data: orders } = await sb.from("store_orders").select("*").or(`seller_user_id.eq.${context.userId}`).order("created_at", { ascending: false }).limit(200);
    const { data: releases } = await sb.from("distribution_releases").select("id, title").eq("user_id", context.userId).order("created_at", { ascending: false });
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    let allOrders: any[] = [];
    if (isAdmin) {
      const { data: a } = await sb.from("store_orders").select("*").order("created_at", { ascending: false }).limit(300);
      allOrders = a ?? [];
    }
    return {
      products: await signImages(sb, products ?? []),
      nfcLinks: links ?? [],
      orders: orders ?? [],
      allOrders,
      isAdmin: !!isAdmin,
      releases: releases ?? [],
    };
  });

const productSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().default(""),
  product_type: z.enum(PRODUCT_TYPES),
  price_cents: z.number().int().min(0).max(10_000_000),
  inventory: z.number().int().min(0).max(1_000_000),
  shipping_info: z.string().trim().max(2000).optional().default(""),
  image_urls: z.array(z.string().max(300)).max(8),
  release_id: z.string().uuid().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  is_featured: z.boolean(),
});

export const saveStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => productSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    for (const p of data.image_urls) if (!p.startsWith(`${context.userId}/`)) throw new Error("Invalid image");
    if (data.status === "published" && data.price_cents < 50) throw new Error("Set a price of at least $0.50 before publishing.");
    if (data.release_id) {
      const { data: rel } = await sb.from("distribution_releases").select("id").eq("id", data.release_id).eq("user_id", context.userId).maybeSingle();
      if (!rel) throw new Error("That release isn't yours.");
    }
    const row = { ...data, user_id: context.userId, currency: "usd", updated_at: new Date().toISOString() };
    const { id, ...rest } = row;
    const q = id
      ? sb.from("store_products").update(rest).eq("id", id).eq("user_id", context.userId).select("id").single()
      : sb.from("store_products").insert(rest).select("id").single();
    const { data: saved, error } = await q;
    if (error) throw new Error(error.message);
    return { id: saved.id as string };
  });

export const deleteStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("store_products").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveNfcLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      productId: z.string().uuid(),
      destination_type: z.enum(["profile", "release", "page"]),
      destination_path: z.string().refine(isSafeNfcPath, "Destination must be a Tunevio page path like /artist/…"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: prod } = await sb.from("store_products").select("id, product_type").eq("id", data.productId).eq("user_id", context.userId).maybeSingle();
    if (!prod) throw new Error("Product not found");
    if (!String(prod.product_type).startsWith("nfc")) throw new Error("Only NFC products have a tag destination.");
    const { data: existing } = await sb.from("store_nfc_links").select("id, destination_path").eq("product_id", data.productId).maybeSingle();
    if (existing) {
      const changed = existing.destination_path !== data.destination_path;
      const { error } = await sb.from("store_nfc_links").update({
        destination_type: data.destination_type, destination_path: data.destination_path, updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, changed };
    }
    const { error } = await sb.from("store_nfc_links").insert({
      product_id: data.productId, user_id: context.userId, destination_type: data.destination_type, destination_path: data.destination_path,
    });
    if (error) throw new Error(error.message);
    return { ok: true, changed: true };
  });

export const confirmNfcProgrammed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; confirmed: boolean }) => z.object({ productId: z.string().uuid(), confirmed: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("store_nfc_links")
      .update({ programmed_confirmed_at: data.confirmed ? new Date().toISOString() : null })
      .eq("product_id", data.productId).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrderFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ orderId: z.string().uuid(), fulfillment_status: z.enum(FULFILLMENT_STATUSES), tracking_number: z.string().trim().max(120).optional().default("") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: o, error } = await sb.from("store_orders")
      .update({ fulfillment_status: data.fulfillment_status, tracking_number: data.tracking_number || null })
      .eq("id", data.orderId).select("id").maybeSingle();
    if (error || !o) throw new Error(error?.message ?? "Order not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("store_order_events").insert({ order_id: o.id, actor_user_id: context.userId, event: `fulfillment:${data.fulfillment_status}`, details: { tracking: data.tracking_number || null } });
    return { ok: true };
  });

export const refundStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS: only the seller, their label managers or admins can read this order.
    const { data: o } = await (context.supabase as any).from("store_orders").select("id, status, stripe_payment_intent_id, environment").eq("id", data.orderId).maybeSingle();
    if (!o) return { error: "Order not found" };
    if (o.status !== "paid" || !o.stripe_payment_intent_id) return { error: "Only paid orders can be refunded." };
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient(o.environment === "live" ? "live" : "sandbox");
      const refund = await stripe.refunds.create({ payment_intent: o.stripe_payment_intent_id });
      if (refund.status === "failed" || refund.status === "canceled") return { error: `Refund ${refund.status}` };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("store_orders").update({ status: "refunded", refunded_at: new Date().toISOString(), fulfillment_status: "cancelled" }).eq("id", o.id);
    await (supabaseAdmin as any).from("store_order_events").insert({ order_id: o.id, actor_user_id: context.userId, event: "refunded" });
    return { error: null as string | null };
  });

// ---------- Buyer ----------
export const listMyStoreOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).from("store_orders")
      .select("id, product_id, product_title, quantity, unit_price_cents, amount_total_cents, currency, status, fulfillment_status, tracking_number, created_at, paid_at")
      .eq("buyer_user_id", context.userId).order("created_at", { ascending: false });
    return { orders: data ?? [] };
  });

export const createStoreCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10),
      returnUrl: z.string().url(),
      environment: z.enum(["sandbox", "live"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const returnUrl = validateReturnUrl(data.returnUrl);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    // Price and stock are always read from the database, never from the client.
    const { data: p } = await admin.from("store_products").select("id, user_id, title, description, price_cents, currency, inventory, status, product_type").eq("id", data.productId).maybeSingle();
    if (!p) return { error: "Product not found", clientSecret: null };
    if (p.user_id === context.userId) return { error: "You can't buy your own product.", clientSecret: null };
    const problem = checkPurchasable(p, data.quantity);
    if (problem) return { error: problem, clientSecret: null };

    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient(data.environment);
      const email = (context.claims as any)?.email as string | undefined;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: returnUrl,
        line_items: [{
          quantity: data.quantity,
          price_data: {
            currency: p.currency || "usd",
            unit_amount: p.price_cents,
            product_data: { name: p.title, tax_code: "txcd_99999999", ...(p.description ? { description: String(p.description).slice(0, 300) } : {}) },
          },
        }],
        automatic_tax: { enabled: true },
        shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "IE", "SE", "NO", "DK", "ES", "IT"] },
        ...(email ? { customer_email: email } : {}),
        metadata: { kind: "store_order", productId: p.id, buyerUserId: context.userId },
        payment_intent_data: { metadata: { kind: "store_order", productId: p.id } },
      } as Stripe.Checkout.SessionCreateParams);
      const { error } = await admin.from("store_orders").insert({
        buyer_user_id: context.userId, buyer_email: email ?? null, seller_user_id: p.user_id, product_id: p.id, product_title: p.title,
        quantity: data.quantity, unit_price_cents: p.price_cents, currency: p.currency || "usd", status: "pending",
        environment: data.environment, stripe_session_id: session.id,
      });
      if (error) return { error: error.message, clientSecret: null };
      return { error: null as string | null, clientSecret: session.client_secret as string };
    } catch (e) {
      return { error: getStripeErrorMessage(e), clientSecret: null };
    }
  });
