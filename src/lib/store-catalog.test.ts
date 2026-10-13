import { describe, expect, it } from "vitest";
import { storeCheckout, storePrice, type StoreProduct } from "./store-catalog";
const product: StoreProduct = { id: "test", title: "Vinyl", image_url: null, min_price_cents: 2500, max_price_cents: 2500, currency: "USD", store: { shop_domain: "artist.myshopify.com", shop_name: "Artist" }, variants: [{ shopify_variant_id: "12345", available: true }] };
describe("existing store catalog", () => {
  it("uses the existing available variant without creating a product", () => {
    expect(storeCheckout(product)).toBe("https://artist.myshopify.com/cart/12345:1");
  });
  it("does not offer unavailable inventory for purchase", () => {
    expect(storeCheckout({ ...product, variants: [{shopify_variant_id: "12345", available: false}] })).toBeNull();
  });
  it("preserves the catalog price and currency", () => {
    expect(storePrice(2500, "USD")).toBe("$25.00");
  });
  it("rejects malformed store purchase destinations", () => {
    expect(storeCheckout({ ...product, store: {shop_domain: "artist.com/evil", shop_name: null} })).toBeNull();
  });
});