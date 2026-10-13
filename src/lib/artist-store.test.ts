import { describe, expect, it } from "vitest";
import { checkPurchasable, isSafeNfcPath } from "./artist-store";

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
});
