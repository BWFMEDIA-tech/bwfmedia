export type StoreCategory = "All" | "Vinyl" | "CDs & cassettes" | "Apparel" | "NFC & collectibles";
export const storeCategories: StoreCategory[] = ["All", "NFC & collectibles", "CDs & cassettes", "Apparel", "Vinyl"];
export interface StoreVariant { shopify_variant_id: string; available: boolean; }
export interface StoreProduct {
  id: string;
  title: string;
  image_url: string | null;
  min_price_cents: number | null;
  max_price_cents: number | null;
  currency: string | null;
  store: { shop_domain: string; shop_name: string | null } | null;
  variants: StoreVariant[] | null;
}
export function productCategory(title: string): StoreCategory {
  if (/\b(vinyl|lp|record)\b/i.test(title)) return "Vinyl";
  if (/\b(cd|cassette|tape)\b/i.test(title)) return "CDs & cassettes";
  if (/\b(shirt|tee|hoodie|cap|hat|apparel|sweatshirt)\b/i.test(title)) return "Apparel";
  return "NFC & collectibles";
}
export function storeCheckout(product: StoreProduct): string | null {
  const domain = product.store?.shop_domain;
  const variant = product.variants?.find((item) => item.available);
  if (!domain || !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain) || !variant || !/^\d+$/.test(variant.shopify_variant_id)) return null;
  return `https://${domain}/cart/${variant.shopify_variant_id}:1`;
}
export function storePrice(cents: number | null, currency: string | null) {
  if (!currency || cents === null || !Number.isFinite(cents)) return "Price at checkout";
  try { return new Intl.NumberFormat("en", { style: "currency", currency }).format(cents / 100); }
  catch { return "Price at checkout"; }
}