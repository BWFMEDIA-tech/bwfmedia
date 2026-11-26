import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateReturnUrl } from "@/lib/validate-return-url";
import { avatarObjectPath } from "@/lib/public-artwork";
import {
  PWYW_MAX_CENTS,
  PWYW_MIN_CENTS,
  PWYW_PRODUCT_TYPES,
  defaultSuggestedPrices,
  pwywSplit,
  validPwywAmount,
  validSuggestedPrices,
} from "@/lib/pwyw";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function readPublicProducts(filter: { artistId?: string; productId?: string }) {
  const client = publicClient();
  let query = client.from("pwyw_products")
    .select("id, artist_user_id, title, description, product_type, artwork_url, release_id, min_price_cents, max_price_cents, suggested_prices_cents, created_at")
    .eq("status", "published").eq("pwyw_enabled", true)
    .order("created_at", { ascending: false }).limit(100);
  if (filter.artistId) query = query.eq("artist_user_id", filter.artistId);
  if (filter.productId) query = query.eq("id", filter.productId);
  const { data: products, error } = await query;
  if (error) throw new Error("Music products are unavailable right now");
  const rows = products ?? [];
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const { data: links, error: linkError } = await client.from("pwyw_product_tracks").select("product_id, track_id, position").in("product_id", ids).order("position");
  if (linkError) throw new Error("Music track lists are unavailable right now");
  const trackIds = [...new Set((links ?? []).map((link) => link.track_id))];
  const artistIds = [...new Set(rows.map((row) => row.artist_user_id))];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [trackResult, artistResult] = await Promise.all([
    trackIds.length ? supabaseAdmin.from("play_tracks").select("id, title, cover_url, duration_seconds").in("id", trackIds) : Promise.resolve({ data: [] }),
    supabaseAdmin.from("profiles").select("id, display_name, stage_name, avatar_url").in("id", artistIds),
  ]);
  const trackMap = new Map((trackResult.data ?? []).map((track) => [track.id, track]));
  const artistMap = new Map((artistResult.data ?? []).map((artist) => [artist.id, artist]));
  return rows.filter((row) => (links ?? []).some((link) => link.product_id === row.id)).map((row) => {
    const productTracks = (links ?? []).filter((link) => link.product_id === row.id).map((link) => trackMap.get(link.track_id)).filter(Boolean);
    const artist = artistMap.get(row.artist_user_id);
    return {
      ...row,
      artist_name: artist?.stage_name || artist?.display_name || "Tunevio artist",
      artist_avatar_url: artist?.avatar_url ?? null,
      artwork_url: row.artwork_url || productTracks[0]?.cover_url || null,
      track_count: productTracks.length,
      tracks: productTracks.map((track) => ({ id: track!.id, title: track!.title, duration_seconds: track!.duration_seconds })),
    };
  });
}

export const listPwywProducts = createServerFn({ method: "GET" })
  .inputValidator((input: { artistId?: string; productId?: string } | undefined) => z.object({
    artistId: z.string().uuid().optional(), productId: z.string().uuid().optional(),
  }).parse(input ?? {}))
  .handler(async ({ data }) => {
    try { return { products: await readPublicProducts(data), error: null as string | null }; }
    catch { return { products: [], error: "Music products are unavailable right now" }; }
  });

async function requirePwywEntitlement(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_entitlement", { _user_id: context.userId, _perk: "pwyw_store" });
  if (error) throw new Error("Your plan access could not be verified");
  if (!data) throw new Error("Unlock Pay What You Want with Artist Pro or Label Plan");
}

export const getMyPwywStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const [entitlement, productResult, catalogResult, salesResult, earningsResult] = await Promise.all([
      sb.rpc("has_entitlement", { _user_id: context.userId, _perk: "pwyw_store" }),
      sb.from("pwyw_products").select("*").eq("artist_user_id", context.userId).order("created_at", { ascending: false }),
      sb.from("play_tracks").select("id, title, cover_url, audio_url, duration_seconds, artist_name, created_at").eq("artist_user_id", context.userId).not("audio_url", "is", null).order("created_at", { ascending: false }).limit(500),
      sb.from("digital_music_purchases").select("id, product_id, product_title, product_type, amount_cents, currency, tax_cents, total_collected_cents, fee_cents, artist_fee_cents, artist_cents, platform_cents, environment, status, created_at, paid_at, refunded_at").eq("artist_user_id", context.userId).order("created_at", { ascending: false }).limit(500),
      sb.from("digital_music_earnings").select("purchase_id, entry_type, amount_cents, fee_cents, artist_fee_cents, artist_cents, platform_cents, environment, created_at").eq("seller_user_id", context.userId).order("created_at", { ascending: false }).limit(1000),
    ]);
    if (productResult.error || catalogResult.error || salesResult.error || earningsResult.error) throw new Error("Your music store could not be loaded");
    const products = productResult.data ?? [];
    const ids = products.map((product: any) => product.id);
    const { data: links, error: linksError } = ids.length
      ? await sb.from("pwyw_product_tracks").select("product_id, track_id, position").in("product_id", ids).order("position")
      : { data: [], error: null };
    if (linksError) throw new Error("Your product track lists could not be loaded");
    return {
      canSell: !!entitlement.data && !entitlement.error,
      catalog: catalogResult.data ?? [],
      products: products.map((product: any) => ({
        ...product,
        track_ids: (links ?? []).filter((link: any) => link.product_id === product.id).sort((a: any, b: any) => a.position - b.position).map((link: any) => link.track_id),
      })),
      sales: salesResult.data ?? [],
      earnings: earningsResult.data ?? [],
    };
  });

const productSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).default(""),
  productType: z.enum(PWYW_PRODUCT_TYPES),
  artworkUrl: z.string().trim().max(1000).nullable().default(null),
  releaseId: z.string().uuid().nullable().default(null),
  enabled: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
  minPriceCents: z.number().int().min(PWYW_MIN_CENTS).max(PWYW_MAX_CENTS),
  maxPriceCents: z.number().int().min(PWYW_MIN_CENTS).max(PWYW_MAX_CENTS),
  suggestedPricesCents: z.array(z.number().int()).max(12),
  trackIds: z.array(z.string().uuid()).min(1).max(100),
}).superRefine((value, ctx) => {
  if (value.maxPriceCents < value.minPriceCents) ctx.addIssue({ code: "custom", message: "Maximum price must be at least the minimum" });
  if (!validSuggestedPrices(value.suggestedPricesCents, value.minPriceCents, value.maxPriceCents)) ctx.addIssue({ code: "custom", message: "Suggested amounts must be unique and within your price range" });
  if (new Set(value.trackIds).size !== value.trackIds.length) ctx.addIssue({ code: "custom", message: "Each song can appear only once" });
  if (value.productType === "single" && value.trackIds.length !== 1) ctx.addIssue({ code: "custom", message: "A single contains exactly one song" });
  if (value.status === "published" && !value.artworkUrl) ctx.addIssue({ code: "custom", message: "Choose a song with artwork before publishing" });
});

export const savePwywProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requirePwywEntitlement(context);
    const sb = context.supabase as any;
    const { data: tracks, error: trackError } = await sb.from("play_tracks")
      .select("id, cover_url, audio_url").eq("artist_user_id", context.userId).in("id", data.trackIds).not("audio_url", "is", null);
    if (trackError || (tracks ?? []).length !== data.trackIds.length) throw new Error("Select songs with audio from your own catalog");
    const allowedArtwork = new Set((tracks ?? []).map((track: any) => track.cover_url).filter(Boolean));
    if (data.releaseId) {
      const { data: release } = await sb.from("distribution_releases").select("id, artwork_url").eq("id", data.releaseId).eq("user_id", context.userId).maybeSingle();
      if (!release) throw new Error("That release is not yours");
      if (release.artwork_url) allowedArtwork.add(release.artwork_url);
    }
    const uploadedArtworkPath = data.artworkUrl ? avatarObjectPath(data.artworkUrl) : null;
    if (uploadedArtworkPath?.startsWith(`${context.userId}/pwyw-covers/`)) allowedArtwork.add(data.artworkUrl!);
    if (data.artworkUrl && !allowedArtwork.has(data.artworkUrl)) throw new Error("Use your uploaded product artwork or artwork from the selected music");
    const fields = {
      artist_user_id: context.userId,
      title: data.title,
      description: data.description,
      product_type: data.productType,
      artwork_url: data.artworkUrl,
      release_id: data.releaseId,
      pwyw_enabled: data.enabled,
      min_price_cents: data.minPriceCents,
      max_price_cents: data.maxPriceCents,
      suggested_prices_cents: data.suggestedPricesCents,
    };
    let productId = data.id;
    if (productId) {
      const { error } = await sb.from("pwyw_products").update(fields).eq("id", productId).eq("artist_user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await sb.from("pwyw_products").insert({ ...fields, status: "draft" }).select("id").single();
      if (error) throw new Error(error.message);
      productId = created.id;
    }
    const { error: deleteError } = await sb.from("pwyw_product_tracks").delete().eq("product_id", productId);
    if (deleteError) throw new Error(deleteError.message);
    const { error: insertError } = await sb.from("pwyw_product_tracks").insert(data.trackIds.map((trackId, position) => ({ product_id: productId, track_id: trackId, position })));
    if (insertError) throw new Error(insertError.message);
    const { error: statusError } = await sb.from("pwyw_products").update({ status: data.status }).eq("id", productId).eq("artist_user_id", context.userId);
    if (statusError) throw new Error(statusError.message);
    return { id: productId };
  });

export const deletePwywProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requirePwywEntitlement(context);
    const sb = context.supabase as any;
    const { data: product } = await sb.from("pwyw_products").select("id, artwork_url").eq("id", data.id).eq("artist_user_id", context.userId).maybeSingle();
    if (!product) throw new Error("Product not found");
    const { error } = await sb.from("pwyw_products").delete().eq("id", data.id).eq("artist_user_id", context.userId);
    if (error) throw new Error(error.message.includes("digital_music_purchases") ? "Unpublish this product instead; it has purchase history" : error.message);
    const artworkPath = product.artwork_url ? avatarObjectPath(product.artwork_url) : null;
    if (artworkPath?.startsWith(`${context.userId}/pwyw-covers/`)) {
      const { data: otherProducts } = await sb.from("pwyw_products").select("id").eq("artwork_url", product.artwork_url).limit(1);
      if (!otherProducts?.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage.from("avatars").remove([artworkPath]);
      }
    }
    return { ok: true };
  });

export const createPwywCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    productId: z.string().uuid(),
    amountCents: z.number().int(),
    checkoutKey: z.string().uuid(),
    returnUrl: z.string().url(),
    environment: z.enum(["sandbox", "live"]),
  }).parse(input))
  .handler(async ({ data, context }): Promise<{ url: string | null; error: string | null }> => {
    try {
      const returnUrl = validateReturnUrl(data.returnUrl);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as any;
      const { data: existing } = await admin.from("digital_music_purchases").select("product_id, amount_cents, status, checkout_url").eq("buyer_user_id", context.userId).eq("checkout_key", data.checkoutKey).maybeSingle();
      if (existing) {
        if (existing.product_id !== data.productId || existing.amount_cents !== data.amountCents) return { url: null, error: "Start a new checkout after changing the product or amount" };
        if (existing.status !== "pending") return { url: null, error: "This checkout was already completed" };
        if (existing.checkout_url) return { url: existing.checkout_url, error: null };
      }
      const { data: product } = await admin.from("pwyw_products").select("id, artist_user_id, title, description, product_type, min_price_cents, max_price_cents").eq("id", data.productId).eq("status", "published").eq("pwyw_enabled", true).maybeSingle();
      if (!product) return { url: null, error: "This music is not available for purchase" };
      if (product.artist_user_id === context.userId) return { url: null, error: "You cannot buy your own music" };
      if (!validPwywAmount(data.amountCents, product.min_price_cents, product.max_price_cents)) return { url: null, error: `Choose an amount from $${(product.min_price_cents / 100).toFixed(2)} to $${(product.max_price_cents / 100).toFixed(2)}` };
      const { data: entitled, error: entitlementError } = await admin.rpc("has_entitlement", { _user_id: product.artist_user_id, _perk: "pwyw_store" });
      if (entitlementError || !entitled) return { url: null, error: "This artist's music store is not currently accepting purchases" };
      const { data: links } = await admin.from("pwyw_product_tracks").select("track_id, position").eq("product_id", product.id).order("position");
      if (!links?.length) return { url: null, error: "This release has no available tracks" };
      const trackIds = links.map((link: any) => link.track_id);
      const { data: tracks } = await admin.from("play_tracks").select("id, audio_url").eq("artist_user_id", product.artist_user_id).in("id", trackIds).not("audio_url", "is", null);
      if ((tracks ?? []).length !== trackIds.length) return { url: null, error: "One or more tracks are no longer available" };

      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const { resolveBillingCustomer } = await import("@/lib/billing-ownership.server");
      const customerId = await resolveBillingCustomer(stripe, context, data.environment);
      const metadata = { kind: "pwyw_purchase", productId: product.id, buyerUserId: context.userId, checkoutKey: data.checkoutKey };
      let session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          success_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: returnUrl,
          customer: customerId,
          line_items: [{
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: data.amountCents,
              product_data: {
                name: product.title,
                description: `Pay What You Want · ${product.product_type} · ${trackIds.length} track${trackIds.length === 1 ? "" : "s"}`.slice(0, 300),
                metadata: { productId: product.id, artistUserId: product.artist_user_id },
              },
            },
          }],
          automatic_tax: { enabled: true },
          billing_address_collection: "required",
          customer_update: { address: "auto", name: "auto" },
          metadata,
          payment_intent_data: { metadata },
        }, { idempotencyKey: `pwyw:${context.userId}:${data.checkoutKey}` });
      } catch (error) {
        const message = getStripeErrorMessage(error);
        if (message.includes("valid head office address")) return { url: null, error: "The artist's checkout tax setup is incomplete. No charge was made." };
        return { url: null, error: message };
      }
      if (!session.url) return { url: null, error: "Checkout could not be opened" };
      const split = pwywSplit(data.amountCents);
      const { error: insertError } = await admin.from("digital_music_purchases").insert({
        buyer_user_id: context.userId,
        artist_user_id: product.artist_user_id,
        product_id: product.id,
        product_title: product.title,
        product_type: product.product_type,
        track_ids: trackIds,
        amount_cents: data.amountCents,
        artist_cents: split.artistCents,
        platform_cents: split.platformCents,
        environment: data.environment,
        checkout_key: data.checkoutKey,
        checkout_url: session.url,
        stripe_session_id: session.id,
      });
      if (insertError) {
        const { data: raced } = await admin.from("digital_music_purchases").select("checkout_url, product_id, amount_cents").eq("buyer_user_id", context.userId).eq("checkout_key", data.checkoutKey).maybeSingle();
        if (raced?.checkout_url && raced.product_id === data.productId && raced.amount_cents === data.amountCents) return { url: raced.checkout_url, error: null };
        return { url: null, error: "Your purchase could not be prepared; no access has been granted" };
      }
      return { url: session.url, error: null };
    } catch (error) {
      return { url: null, error: error instanceof Error ? error.message : "Checkout is unavailable right now" };
    }
  });

export const confirmPwywCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    sessionId: z.string().regex(/^cs_(live|test)_[A-Za-z0-9]+$/),
    environment: z.enum(["sandbox", "live"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(data.environment);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { confirmPwywCheckoutForBuyer } = await import("@/lib/pwyw-payment.server");
      return await confirmPwywCheckoutForBuyer(stripe, supabaseAdmin, data.sessionId, context.userId, data.environment);
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      const message = getStripeErrorMessage(error);
      return { kind: "error" as const, error: /still processing|not complete|could not be verified/i.test(message) ? message : "We could not verify this music checkout for the signed-in account" };
    }
  });

function audioStoragePath(url: string | null): string | null {
  if (!url) return null;
  for (const marker of ["/object/public/artist-audio/", "/object/sign/artist-audio/"]) {
    const index = url.indexOf(marker);
    if (index !== -1) return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
  }
  return url.startsWith("http") ? null : url.replace(/^\/+/, "");
}

export const listMyPwywPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: purchases, error } = await (context.supabase as any).from("digital_music_purchases")
      .select("id, product_id, product_title, product_type, track_ids, amount_cents, currency, tax_cents, total_collected_cents, status, environment, created_at, paid_at, refunded_at, stripe_session_id")
      .eq("buyer_user_id", context.userId).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Your purchases could not be loaded");
    const paidIds = [...new Set((purchases ?? []).filter((purchase: any) => purchase.status === "paid").flatMap((purchase: any) => purchase.track_ids))] as string[];
    if (!paidIds.length) return (purchases ?? []).map((purchase: any) => ({ ...purchase, tracks: [] }));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tracks } = await supabaseAdmin.from("play_tracks").select("id, title, artist_name, artist_user_id, audio_url, cover_url, duration_seconds").in("id", paidIds);
    const signed = await Promise.all((tracks ?? []).map(async (track) => {
      const path = audioStoragePath(track.audio_url);
      if (!path) return { ...track, signed_url: null };
      const { data: url } = await supabaseAdmin.storage.from("artist-audio").createSignedUrl(path, 600);
      return { ...track, signed_url: url?.signedUrl ?? null };
    }));
    const trackMap = new Map(signed.map((track) => [track.id, track]));
    return (purchases ?? []).map((purchase: any) => ({
      ...purchase,
      tracks: purchase.status === "paid" ? purchase.track_ids.map((id: string) => {
        const track = trackMap.get(id);
        return track ? {
          id: track.id,
          title: track.title,
          artist: track.artist_name,
          artistId: track.artist_user_id,
          audioUrl: track.signed_url,
          coverUrl: track.cover_url,
          durationSec: track.duration_seconds,
        } : null;
      }).filter(Boolean) : [],
    }));
  });

export const createPwywDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { purchaseId: string; trackId: string }) => z.object({ purchaseId: z.string().uuid(), trackId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: purchase } = await (context.supabase as any).from("digital_music_purchases").select("id, artist_user_id, track_ids").eq("id", data.purchaseId).eq("buyer_user_id", context.userId).eq("status", "paid").maybeSingle();
    if (!purchase || !purchase.track_ids.includes(data.trackId)) throw new Error("This purchase does not include that track");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The purchase snapshot authorizes the track even if its current public visibility changes.
    const { data: ownedTrack } = await supabaseAdmin.from("play_tracks").select("title, audio_url").eq("id", data.trackId).eq("artist_user_id", purchase.artist_user_id).maybeSingle();
    const path = audioStoragePath(ownedTrack?.audio_url ?? null);
    if (!path) throw new Error("This audio file is no longer available");
    const baseName = `${(ownedTrack?.title || "Tunevio track").replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 100) || "Tunevio track"}`;
    const extension = path.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const filename = extension && extension.length <= 5 ? `${baseName}.${extension}` : baseName;
    const { data: signed, error } = await supabaseAdmin.storage.from("artist-audio").createSignedUrl(path, 300, { download: filename });
    if (error || !signed?.signedUrl) throw new Error("A secure download link could not be created");
    return { url: signed.signedUrl };
  });

export const refundPwywPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { purchaseId: string }) => z.object({ purchaseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: purchase } = await (context.supabase as any).from("digital_music_purchases").select("id, artist_user_id, stripe_payment_intent_id, environment, status").eq("id", data.purchaseId).maybeSingle();
    if (!purchase || purchase.artist_user_id !== context.userId) {
      const { data: isAdmin } = await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" });
      if (!isAdmin) return { error: "Only the seller or an admin can refund this purchase" };
    }
    if (purchase.status !== "paid" || !purchase.stripe_payment_intent_id) return { error: "Only paid purchases can be refunded" };
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient(purchase.environment);
      const refund = await stripe.refunds.create({ payment_intent: purchase.stripe_payment_intent_id });
      if (refund.status === "failed" || refund.status === "canceled") return { error: `Refund ${refund.status}` };
      return { error: null as string | null };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export { defaultSuggestedPrices };
