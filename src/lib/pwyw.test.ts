import { describe, expect, it } from "vitest";
import { defaultSuggestedPrices, formatUsd, parseUsdToCents, pwywSplit, validPwywAmount, validSuggestedPrices } from "./pwyw";

describe("Pay What You Want pricing", () => {
  it.each([["1", 100], ["1.25", 125], ["7.50", 750], ["19.99", 1999], ["250.00", 25000], ["10,000.00", 1000000]])("parses %s exactly", (value, cents) => {
    expect(parseUsdToCents(value)).toBe(cents);
  });
  it.each(["0.001", "1.999", "-2", "abc", "1.2.3", ""])("rejects invalid decimal input %s", (value) => {
    expect(parseUsdToCents(value)).toBeNull();
  });
  it("enforces the $1 minimum and $10,000 maximum", () => {
    expect(validPwywAmount(99)).toBe(false);
    expect(validPwywAmount(100)).toBe(true);
    expect(validPwywAmount(1000000)).toBe(true);
    expect(validPwywAmount(1000001)).toBe(false);
  });
  it("honors an artist's narrower range", () => {
    expect(validPwywAmount(499, 500, 5000)).toBe(false);
    expect(validPwywAmount(500, 500, 5000)).toBe(true);
    expect(validPwywAmount(5001, 500, 5000)).toBe(false);
  });
  it.each([
    [100, 60, 40],
    [1000, 600, 400],
    [10000, 6000, 4000],
    [100000, 60000, 40000],
    [1000000, 600000, 400000],
  ])("splits %i cents 60/40 before fees and taxes", (amount, artist, platform) => {
    expect(pwywSplit(amount)).toMatchObject({ artistCents: artist, platformCents: platform });
  });
  it("keeps every odd cent accounted for and allocates the real processing fee", () => {
    const split = pwywSplit(101, 31);
    expect(split.artistCents + split.platformCents).toBe(101);
    expect(split.artistFeeCents + split.platformFeeCents).toBe(31);
    expect(split.artistNetCents).toBe(42);
    expect(split.platformNetCents).toBe(28);
  });
  it("requires unique suggested amounts inside the artist range", () => {
    expect(validSuggestedPrices([500, 1000], 100, 1000000)).toBe(true);
    expect(validSuggestedPrices([500, 500], 100, 1000000)).toBe(false);
    expect(validSuggestedPrices([100], 500, 1000000)).toBe(false);
    expect(defaultSuggestedPrices(500, 5000)).toEqual([500, 1000, 2500, 5000]);
  });
  it("formats large values for fans", () => {
    expect(formatUsd(1000000)).toBe("$10,000.00");
  });
});
