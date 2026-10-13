// Shared, browser-safe helpers for the Artist Store (physical music + NFC).
export const PRODUCT_TYPES = ["vinyl", "cd", "cassette", "nfc_keychain", "nfc_other", "merch"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  vinyl: "Vinyl",
  cd: "CD",
  cassette: "Cassette",
  nfc_keychain: "NFC Keychain",
  nfc_other: "NFC Collectible",
  merch: "Merch",
};

export const FULFILLMENT_STATUSES = ["unfulfilled", "processing", "shipped", "delivered", "cancelled"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export function isNfcType(t: string): boolean {
  return t === "nfc_keychain" || t === "nfc_other";
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

/** Validates a requested quantity against live stock. Returns an error message or null. */
export function checkPurchasable(p: { status: string; inventory: number; price_cents: number }, qty: number): string | null {
  if (p.status !== "published") return "This product isn't available.";
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) return "Choose a quantity between 1 and 10.";
  if (p.price_cents < 50) return "This product has no price set yet.";
  if (p.inventory < qty) return p.inventory === 0 ? "Sold out." : `Only ${p.inventory} left.`;
  return null;
}

export function formatPrice(cents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
