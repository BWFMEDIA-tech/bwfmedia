export const PWYW_MIN_CENTS = 100;
export const PWYW_MAX_CENTS = 1_000_000;
export const PWYW_ARTIST_BPS = 6_000;
export const PWYW_PRODUCT_TYPES = ["single", "ep", "album", "deluxe", "exclusive"] as const;
export type PwywProductType = (typeof PWYW_PRODUCT_TYPES)[number];

export type PwywSplit = {
  artistCents: number;
  platformCents: number;
  artistFeeCents: number;
  platformFeeCents: number;
  artistNetCents: number;
  platformNetCents: number;
};

/** Integer-only accounting: the 60/40 split applies to music revenue before tax and fees. */
export function pwywSplit(amountCents: number, feeCents = 0): PwywSplit {
  if (!Number.isInteger(amountCents) || amountCents < 0 || !Number.isInteger(feeCents) || feeCents < 0) {
    throw new Error("Amounts must be non-negative integer cents");
  }
  const artistCents = Math.floor((amountCents * PWYW_ARTIST_BPS) / 10_000);
  const platformCents = amountCents - artistCents;
  const artistFeeCents = Math.floor((feeCents * PWYW_ARTIST_BPS) / 10_000);
  const platformFeeCents = feeCents - artistFeeCents;
  return {
    artistCents,
    platformCents,
    artistFeeCents,
    platformFeeCents,
    artistNetCents: artistCents - artistFeeCents,
    platformNetCents: platformCents - platformFeeCents,
  };
}

/** Parses decimal USD without binary floating-point payment arithmetic. */
export function parseUsdToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(trimmed)) return null;
  const [whole = "", fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0") || 0);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function validPwywAmount(amountCents: number, minCents = PWYW_MIN_CENTS, maxCents = PWYW_MAX_CENTS): boolean {
  return Number.isInteger(amountCents)
    && Number.isInteger(minCents)
    && Number.isInteger(maxCents)
    && minCents >= PWYW_MIN_CENTS
    && maxCents <= PWYW_MAX_CENTS
    && minCents <= maxCents
    && amountCents >= minCents
    && amountCents <= maxCents;
}

export function validSuggestedPrices(prices: number[], minCents: number, maxCents: number): boolean {
  return prices.length <= 12
    && new Set(prices).size === prices.length
    && prices.every((price) => validPwywAmount(price, minCents, maxCents));
}

export function defaultSuggestedPrices(minCents = PWYW_MIN_CENTS, maxCents = PWYW_MAX_CENTS): number[] {
  return [100, 500, 1_000, 2_500, 5_000, 10_000].filter((price) => validPwywAmount(price, minCents, maxCents));
}
