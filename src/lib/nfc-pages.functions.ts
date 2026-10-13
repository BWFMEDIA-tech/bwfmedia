import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkTagQuantity, uniqueIds, type PageTab } from "@/lib/nfc-pages";
import { validateReturnUrl } from "@/lib/validate-return-url";

const BUCKET = "store-products";
const path = z.string().max(300).regex(/^[0-9a-f-]{36}\/[A-Za-z0-9/_.-]+$/);
const tabSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(["music", "video", "product"]),
  title: z.string().max(120),
  subtitle: z.string().max(160).optional(),
  artist: z.string().max(120).optional(),
  date: z.string().max(20).optional(),
  description: z.string().max(4000).optional(),
  cover: path.optional(),
  images: z.array(path).max(8).optional(),
  trackIds: z.array(z.string().uuid()).max(30).optional(),
  videoId: z.string().uuid().optional(),
});

function ownedPaths(tabs: PageTab[], userId: string) {
  return tabs.flatMap((t) => [t.cover, ...(t.images ?? [])]).filter((p): p is string => !!p && p.startsWith(`${userId}/`));
}

// ---------- Owner ----------
export const listMyPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data } = await sb.from("nfc_pages").select("id, name, code, status, tabs, created_at, updated_at").eq("user_id", context.userId).order("created_at", { ascending: false });
    return { pages: data ?? [] };
  });

export const createPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("nfc_pages").insert({ user_id: context.userId, name: data.name }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const getMyPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: page } = await sb.from("nfc_pages").select("id, name, code, status, tabs").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (!page) return { page: null, tracks: [], videos: [] };
    const [{ data: tracks }, { data: videos }] = await Promise.all([
      sb.from("play_tracks").select("id, title, cover_url, audio_url").eq("artist_user_id", context.userId).not("audio_url", "is", null).order("created_at", { ascending: false }).limit(200),
      sb.from("videos").select("id, title").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100),
    ]);
    // Same song uploaded twice shows once.
    const seen = new Set<string>();
    const uniqueTracks = (tracks ?? []).filter((t: any) => { const k = String(t.title).trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    return { page, tracks: uniqueTracks, videos: videos ?? [] };
  });

export const savePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(), name: z.string().trim().min(1).max(80), status: z.enum(["draft", "published"]), tabs: z.array(tabSchema).max(12),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const tabs = data.tabs.map((t) => ({ ...t, trackIds: t.trackIds ? uniqueIds(t.trackIds) : undefined }));
    for (const p of tabs.flatMap((t) => [t.cover, ...(t.images ?? [])])) if (p && !p.startsWith(`${context.userId}/`)) throw new Error("Invalid image");
    const ids = uniqueIds(tabs.flatMap((t) => t.trackIds ?? []));
    if (ids.length) {
      const { data: own } = await sb.from("play_tracks").select("id").eq("artist_user_id", context.userId).in("id", ids);
      if ((own ?? []).length !== ids.length) throw new Error("Only your own songs can be added.");
    }
    const vids = tabs.map((t) => t.videoId).filter(Boolean) as string[];
    if (vids.length) {
      const { data: own } = await sb.from("videos").select("id").eq("user_id", context.userId).in("id", vids);
      if ((own ?? []).length !== new Set(vids).size) throw new Error("Only your own videos can be added.");
    }
    const { error } = await sb.from("nfc_pages").update({ name: data.name, status: data.status, tabs, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("nfc_pages").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Public tap page ----------
export const getPublicPage = createServerFn({ method: "GET" })
  .inputValidator((d: { code: string }) => z.object({ code: z.string().regex(/^[a-z0-9]{6,32}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: page } = await admin.from("nfc_pages").select("id, user_id, name, tabs").eq("code", data.code).eq("status", "published").maybeSingle();
    if (!page) return { page: null };
    const tabs = (page.tabs ?? []) as PageTab[];
    const paths = ownedPaths(tabs, page.user_id);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: s } = await admin.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 6);
      for (const r of s ?? []) if (r.signedUrl && r.path) signed.set(r.path, r.signedUrl);
    }
    const trackIds = uniqueIds(tabs.flatMap((t) => t.trackIds ?? []));
    const videoIds = tabs.map((t) => t.videoId).filter(Boolean) as string[];
    const [{ data: tracks }, { data: videos }, { data: prof }] = await Promise.all([
      trackIds.length ? admin.from("play_tracks").select("id, title, artist_name, cover_url, audio_url").eq("artist_user_id", page.user_id).in("id", trackIds) : Promise.resolve({ data: [] }),
      videoIds.length ? admin.from("videos").select("id, title").eq("user_id", page.user_id).in("id", videoIds) : Promise.resolve({ data: [] }),
      admin.from("profiles").select("display_name").eq("id", page.user_id).maybeSingle(),
    ]);
    const tm = new Map((tracks ?? []).map((t: any) => [t.id, t]));
    const vm = new Map((videos ?? []).map((v: any) => [v.id, v]));
    return {
      page: {
        name: page.name as string,
        artistId: page.user_id as string,
        artistName: (prof?.display_name as string) ?? null,
        tabs: tabs.map((t) => ({
          ...t,
          coverUrl: t.cover ? signed.get(t.cover) ?? null : null,
          imageUrls: (t.images ?? []).map((p) => signed.get(p)).filter(Boolean) as string[],
          tracks: (t.trackIds ?? []).map((id) => tm.get(id)).filter(Boolean) as any[],
          video: t.videoId ? (vm.get(t.videoId) as any) ?? null : null,
        })),
      },
    };
  });

// ---------- Tag ordering (artists buy from Tunevio) ----------
export const listTagProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const [{ data: products }, { data: orders }] = await Promise.all([
      sb.from("nfc_tag_products").select("id, name, tag_type, description, price_cents, shipping_cents, currency, min_quantity, active").eq("active", true).gte("price_cents", 50).order("price_cents"),
      sb.from("nfc_tag_orders").select("id, order_number, product_name, quantity, amount_total_cents, unit_price_cents, shipping_cents, currency, status, fulfillment_status, tracking_number, carrier, shipped_at, delivered_at, created_at, page_id").eq("buyer_user_id", context.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return { products: products ?? [], orders: orders ?? [] };
  });

export const createTagCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    productId: z.string().uuid(), pageId: z.string().uuid().nullable(), quantity: z.number().int().min(1).max(1000),
    returnUrl: z.string().url(), environment: z.enum(["sandbox", "live"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const returnUrl = validateReturnUrl(data.returnUrl);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    // Price always read from the database.
    const { data: p } = await admin.from("nfc_tag_products").select("id, name, description, price_cents, shipping_cents, currency, min_quantity, active").eq("id", data.productId).maybeSingle();
    if (!p) return { error: "Tag not found", clientSecret: null };
    const problem = checkTagQuantity(p, data.quantity);
    if (problem) return { error: problem, clientSecret: null };
    if (data.pageId) {
      const { data: pg } = await admin.from("nfc_pages").select("id").eq("id", data.pageId).eq("user_id", context.userId).maybeSingle();
      if (!pg) return { error: "Page not found", clientSecret: null };
    }
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient(data.environment);
      const email = (context.claims as any)?.email as string | undefined;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: returnUrl,
        line_items: [{ quantity: data.quantity, price_data: { currency: p.currency || "usd", unit_amount: p.price_cents, product_data: { name: p.name, tax_code: "txcd_99999999", ...(p.description ? { description: String(p.description).slice(0, 300) } : {}) } } }],
        automatic_tax: { enabled: true },
        shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "IE", "SE", "NO", "DK", "ES", "IT"] },
        ...(p.shipping_cents > 0 ? { shipping_options: [{ shipping_rate_data: { type: "fixed_amount", display_name: "Shipping", fixed_amount: { amount: p.shipping_cents, currency: p.currency || "usd" } } }] } : {}),
        ...(email ? { customer_email: email } : {}),
        metadata: { kind: "nfc_tag_order", buyerUserId: context.userId },
      } as Stripe.Checkout.SessionCreateParams);
      const { error } = await admin.from("nfc_tag_orders").insert({
        buyer_user_id: context.userId, tag_product_id: p.id, page_id: data.pageId, product_name: p.name, quantity: data.quantity,
        unit_price_cents: p.price_cents, shipping_cents: p.shipping_cents ?? 0, customer_email: email ?? null, currency: p.currency || "usd", environment: data.environment, stripe_session_id: session.id,
      });
      if (error) return { error: error.message, clientSecret: null };
      return { error: null as string | null, clientSecret: session.client_secret as string };
    } catch (e) {
      return { error: getStripeErrorMessage(e), clientSecret: null };
    }
  });
