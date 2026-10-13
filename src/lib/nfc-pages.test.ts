import { describe, expect, it } from "vitest";
import { checkTagQuantity, moveId, moveTab, uniqueIds } from "./nfc-pages";
import { isSafeNfcPath } from "./artist-store";

describe("nfc pages", () => {
  it("moves tabs within bounds", () => {
    expect(moveTab(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveTab(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
  it("reorders tracks within bounds", () => {
    expect(moveId(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
    expect(moveId(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
  it("drops duplicate tracks", () => expect(uniqueIds(["x", "y", "x"])).toEqual(["x", "y"]));
  it("blocks inactive or unpriced tags", () => {
    expect(checkTagQuantity({ active: false, price_cents: 500, min_quantity: 1 }, 5)).not.toBeNull();
    expect(checkTagQuantity({ active: true, price_cents: 0, min_quantity: 1 }, 5)).not.toBeNull();
  });
  it("enforces minimum quantity", () => {
    expect(checkTagQuantity({ active: true, price_cents: 500, min_quantity: 10 }, 5)).not.toBeNull();
    expect(checkTagQuantity({ active: true, price_cents: 500, min_quantity: 10 }, 10)).toBeNull();
  });
  it("allows page links as NFC destinations", () => expect(isSafeNfcPath("/p/abc123def0")).toBe(true));
});

import { allowedFulfillment, tagOrderStatus, checkTagPricing } from "./nfc-pages";
describe("tag order rules", () => {
  it("unpaid orders cannot be fulfilled", () => { expect(allowedFulfillment("pending", "unfulfilled")).toEqual([]); });
  it("delivered orders are final", () => { expect(allowedFulfillment("paid", "delivered")).toEqual([]); });
  it("shipped can only become delivered", () => { expect(allowedFulfillment("paid", "shipped")).toEqual(["delivered"]); });
  it("refund wins over shipping", () => { expect(tagOrderStatus({ status: "refunded", fulfillment_status: "shipped" })).toBe("Refunded"); });
  it("unpaid shows pending payment", () => { expect(tagOrderStatus({ status: "pending", fulfillment_status: "unfulfilled" })).toBe("Pending Payment"); });
  it("can't turn on ordering without a price", () => { expect(checkTagPricing({ price_cents: 0, shipping_cents: 0, min_quantity: 1, active: true })).not.toBeNull(); });
  it("rejects negative shipping", () => { expect(checkTagPricing({ price_cents: 500, shipping_cents: -1, min_quantity: 1, active: true })).not.toBeNull(); });
});
