import { describe, expect, it } from "vitest";
import { SUGGESTED_PRICE_CENTS, DEFAULT_ARTIST_BPS, categoryOf, checkPurchasable, computeShipping, computeSplit } from "./artist-store";

const approved = { status: "published", review_status: "approved", inventory: 5, price_cents: 2999, cost_cents: 1000, min_quantity: 1, made_to_order: false };

describe("suggested retail prices", () => {
  it("matches the agreed defaults", () => {
    expect(SUGGESTED_PRICE_CENTS).toEqual({ nfc_keychain: 1999, nfc_card: 1499, cd: 1299, cassette: 1499, tshirt: 2999, hoodie: 5999, vinyl: 2999 });
    expect(SUGGESTED_PRICE_CENTS.nfc_other).toBeUndefined();
  });
  it("places products in the four categories", () => {
    expect([categoryOf("nfc_card"), categoryOf("cassette"), categoryOf("hoodie"), categoryOf("vinyl")]).toEqual(["nfc", "cds_cassettes", "apparel", "vinyl"]);
  });
});

describe("revenue split", () => {
  it("pays artists 100% of net profit", () => expect(DEFAULT_ARTIST_BPS).toBe(10000));
  it("gives the artist the full $29.99 tee example profit", () => {
    expect(computeSplit({ revenue_cents: 2999, cost_cents: 1000, fee_cents: 117, artist_bps: 10000 })).toEqual({ profit_cents: 1882, artist_cents: 1882, platform_cents: 0 });
  });
  it("never pays more than the profit", () => {
    const r = computeSplit({ revenue_cents: 1001, cost_cents: 0, fee_cents: 0, artist_bps: 10000 });
    expect(r.artist_cents + r.platform_cents).toBe(1001);
  });
  it("pays nobody when there is no profit", () => {
    expect(computeSplit({ revenue_cents: 1000, cost_cents: 900, fee_cents: 200, artist_bps: 10000 })).toMatchObject({ artist_cents: 0, platform_cents: 0 });
  });
});

describe("shipping", () => {
  it("charges once per order plus each extra item", () => {
    expect(computeShipping({ first_item_cents: 500, additional_item_cents: 100 }, 3)).toBe(700);
  });
  it("has no amount without a rule", () => expect(computeShipping(null, 1)).toBeNull());
});

describe("purchase guard", () => {
  it("allows an approved, priced, stocked product", () => expect(checkPurchasable(approved, 1, { hasShippingRule: true })).toBeNull());
  it("blocks products not yet reviewed", () => expect(checkPurchasable({ ...approved, review_status: "pending" }, 1, { hasShippingRule: true })).not.toBeNull());
  it("blocks missing cost", () => expect(checkPurchasable({ ...approved, cost_cents: null }, 1, { hasShippingRule: true })).not.toBeNull());
  it("blocks missing price", () => expect(checkPurchasable({ ...approved, price_cents: 0 }, 1, { hasShippingRule: true })).not.toBeNull());
  it("blocks missing shipping", () => expect(checkPurchasable(approved, 1, { hasShippingRule: false })).not.toBeNull());
  it("enforces minimum quantity", () => expect(checkPurchasable({ ...approved, min_quantity: 3 }, 2, { hasShippingRule: true })).not.toBeNull());
  it("lets made-to-order items sell past stock", () => expect(checkPurchasable({ ...approved, inventory: 0, made_to_order: true }, 2, { hasShippingRule: true })).toBeNull());
});
