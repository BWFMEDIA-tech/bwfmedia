import { describe, expect, it } from "vitest";
import { validateReturnUrl } from "./validate-return-url";

describe("validateReturnUrl", () => {
  it("accepts the production domain (tunevio.com) — Stripe return URLs", () => {
    expect(validateReturnUrl("https://tunevio.com/checkout/return?session_id=cs_x")).toBe(
      "https://tunevio.com/checkout/return?session_id=cs_x",
    );
    expect(validateReturnUrl("https://www.tunevio.com/credits?checkout=success")).toContain(
      "www.tunevio.com",
    );
  });

  it("accepts legacy branding + lovable preview domains and localhost", () => {
    for (const u of [
      "https://bwfmedia.company/pay/return",
      "https://bwfnetwork.com/settings/billing",
      "https://tunevio.lovable.app/pricing",
      "http://localhost:8080/checkout/return",
    ]) {
      expect(() => validateReturnUrl(u)).not.toThrow();
    }
  });

  it("rejects off-domain hosts (open-redirect / phishing guard)", () => {
    for (const u of [
      "https://evil.com/steal",
      "https://tunevio.com.evil.com/x",
      "https://not-tunevio.com/x",
    ]) {
      expect(() => validateReturnUrl(u)).toThrow();
    }
  });

  it("rejects malformed and non-http(s) URLs", () => {
    expect(() => validateReturnUrl("not a url")).toThrow();
    expect(() => validateReturnUrl("javascript:alert(1)")).toThrow();
    expect(() => validateReturnUrl("ftp://tunevio.com/x")).toThrow();
  });
});
