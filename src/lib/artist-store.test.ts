import { describe, expect, it } from "vitest";
import { checkPurchasable, isSafeNfcPath, isStoreProductLive, resolveStoreCheckoutBuyer, storeProductStatusLabel } from "./artist-store";

describe("artist store rules", () => {
  it("blocks buying more than the stock left", () => {
    expect(checkPurchasable({ status: "published", inventory: 2, price_cents: 2500 }, 3)).toBe("Only 2 left.");
  });
  it("blocks sold-out products", () => {
    expect(checkPurchasable({ status: "published", inventory: 0, price_cents: 2500 }, 1)).toBe("Sold out.");
  });
  it("blocks draft products", () => {
    expect(checkPurchasable({ status: "draft", inventory: 5, price_cents: 2500 }, 1)).not.toBeNull();
  });
  it("allows a valid purchase", () => {
    expect(checkPurchasable({ status: "published", inventory: 5, price_cents: 2500 }, 2)).toBeNull();
  });
  it("only allows NFC destinations on Tunevio", () => {
    expect(isSafeNfcPath("/artist/abc")).toBe(true);
    expect(isSafeNfcPath("https://evil.com")).toBe(false);
    expect(isSafeNfcPath("//evil.com")).toBe(false);
    expect(isSafeNfcPath("/x<script>")).toBe(false);
  });
  it("shows only published and approved products to fans", () => {
    expect(isStoreProductLive({ status: "published", review_status: "approved" })).toBe(true);
    expect(isStoreProductLive({ status: "published", review_status: "pending" })).toBe(false);
    expect(isStoreProductLive({ status: "draft", review_status: "approved" })).toBe(false);
  });
  it("labels owner-only product states accurately", () => {
    expect(storeProductStatusLabel({ status: "draft", review_status: "approved" })).toBe("Draft");
    expect(storeProductStatusLabel({ status: "published", review_status: "pending" })).toBe("In review");
    expect(storeProductStatusLabel({ status: "published", review_status: "approved" })).toBe("Live for fans");
  });
  it("allows a guest buyer without creating account ownership", () => {
    expect(resolveStoreCheckoutBuyer(null, "seller1")).toEqual({ error: null, buyerUserId: null, buyerEmail: null });
  });
  it("preserves a verified listener's order ownership", () => {
    expect(resolveStoreCheckoutBuyer({ id: "listener1", email: "fan@example.com" }, "seller1")).toEqual({ error: null, buyerUserId: "listener1", buyerEmail: "fan@example.com" });
  });
  it("still prevents artists from buying their own products", () => {
    expect(resolveStoreCheckoutBuyer({ id: "seller1", email: "artist@example.com" }, "seller1").error).toBe("You can't buy your own product.");
  });
});
