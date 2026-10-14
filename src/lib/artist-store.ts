// Shared, browser-safe helpers for the Artist Store (physical music + NFC + merch).
export const PRODUCT_TYPES = ["vinyl", "cd", "cassette", "nfc_keychain", "nfc_card", "nfc_other", "tshirt", "hoodie", "merch"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  vinyl: "Vinyl",
  cd: "CD",
  cassette: "Cassette",
  nfc_keychain: "NFC Keychain",
  nfc_card: "NFC Artist Card",
  nfc_other: "NFC Collectible",
  tshirt: "T-shirt",
  hoodie: "Hoodie",
  merch: "Other apparel",
};

export const STORE_CATEGORIES = ["nfc", "cds_cassettes", "apparel", "vinyl"] as const;
export type StoreMerchCategory = (typeof STORE_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<StoreMerchCategory, string> = {
  nfc: "NFC & Collectibles",
  cds_cassettes: "CDs & Cassettes",
  apparel: "Apparel",
  vinyl: "Vinyl",
};

export function categoryOf(t: string): StoreMerchCategory {
  if (t === "vinyl") return "vinyl";
  if (t === "cd" || t === "cassette") return "cds_cassettes";
  if (t.startsWith("nfc")) return "nfc";
  return "apparel";
}

/** Suggested retail prices (cents). Suggestions only — admins set the real price before sale. */
export const SUGGESTED_PRICE_CENTS: Partial<Record<ProductType, number>> = {
  nfc_keychain: 1999,
  nfc_card: 1499,
  cd: 1299,
  cassette: 1499,
  tshirt: 2999,
  hoodie: 5999,
  vinyl: 2999,
};

export const DEFAULT_ARTIST_BPS = 10000; // artists keep 100% of net profit (split removed)

export const FULFILLMENT_STATUSES = ["unfulfilled", "processing", "shipped", "delivered", "cancelled"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];
export const REVIEW_STATUSES = ["draft", "pending", "approved", "disabled"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const SHIPPING_REGIONS = ["domestic", "international"] as const;
export type ShippingRegion = (typeof SHIPPING_REGIONS)[number];

export function isNfcType(t: string): boolean {
  return t.startsWith("nfc");
}

/** NFC destinations must stay on Tunevio: a relative path with safe characters only. */
export function isSafeNfcPath(path: string): boolean {
  if (typeof path !== "string" || path.length < 1 || path.length > 300) return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  return /^\/[A-Za-z0-9/_.?=&-]*$/.test(path);
}

export function nfcDestinationFor(type: "profile" | "release" | "page", artistId: string, value?: string): string {
  if (type === "profile") return `/artist/${artistId}`;
  if (type === "release") return `/artist/${artistId}?release=${value ?? ""}`;
  return value ?? "/";
}

export interface PurchasableInput {
  status: string;
  review_status?: string | null;
  inventory: number;
  price_cents: number;
  cost_cents?: number | null;
  min_quantity?: number | null;
  made_to_order?: boolean | null;
}

/** Validates a requested quantity against live price, review and stock. Returns an error message or null. */
export function checkPurchasable(p: PurchasableInput, qty: number, opts: { hasShippingRule?: boolean } = {}): string | null {
  if (p.status !== "published") return "This product isn't available.";
  if (p.review_status !== undefined && p.review_status !== "approved") return "This product is waiting for Tunevio review.";
  const min = Math.max(1, p.min_quantity ?? 1);
  if (!Number.isInteger(qty) || qty < min || qty > 10) return min > 1 ? `Choose a quantity between ${min} and 10.` : "Choose a quantity between 1 and 10.";
  if (!Number.isInteger(p.price_cents) || p.price_cents < 50) return "This product has no price set yet.";
  if (p.review_status !== undefined && (p.cost_cents == null || p.cost_cents < 0)) return "This product has no confirmed cost yet.";
  if (opts.hasShippingRule === false) return "Shipping isn't set up for this product yet.";
  if (!p.made_to_order && p.inventory < qty) return p.inventory === 0 ? "Sold out." : `Only ${p.inventory} left.`;
  return null;
}

/** Shipping: first item + each additional item. One charge per order, never per unit twice. */
export function computeShipping(rule: { first_item_cents: number; additional_item_cents: number } | null, qty: number): number | null {
  if (!rule || qty < 1) return null;
  return rule.first_item_cents + rule.additional_item_cents * (qty - 1);
}

export interface SplitResult { profit_cents: number; artist_cents: number; platform_cents: number }

/**
 * Net merchandise profit = revenue (no tax, no shipping) − cost − payment fee − approved direct costs.
 * Artist share rounds to the nearest cent (half up); Tunevio receives the remainder, so the total equals profit.
 * Negative profit pays nobody.
 */
export function computeSplit(i: { revenue_cents: number; cost_cents: number; fee_cents: number; other_cents?: number; artist_bps: number }): SplitResult {
  const profit = i.revenue_cents - i.cost_cents - i.fee_cents - (i.other_cents ?? 0);
  if (profit <= 0) return { profit_cents: Math.min(profit, 0), artist_cents: 0, platform_cents: 0 };
  const bps = Math.min(10000, Math.max(0, Math.round(i.artist_bps)));
  const artist = Math.round((profit * bps) / 10000);
  return { profit_cents: profit, artist_cents: artist, platform_cents: profit - artist };
}

export function formatPrice(cents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
