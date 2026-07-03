import { describe, expect, it } from "vitest";
import {
  buildVoteTotals,
  computeVotePercentages,
  formatVoteDebugLog,
  validateVoteTotals,
} from "./vote-math";

describe("computeVotePercentages — spec expected outputs", () => {
  it("1 vote each → 50% / 50%", () => {
    const p = computeVotePercentages(1, 1);
    expect([p.aPctDisplay, p.bPctDisplay]).toEqual([50, 50]);
    expect([p.aPct, p.bPct]).toEqual([50, 50]);
  });

  it("2 vs 1 → 67% / 33%", () => {
    const p = computeVotePercentages(2, 1);
    expect([p.aPctDisplay, p.bPctDisplay]).toEqual([67, 33]);
    expect(p.aPct).toBeCloseTo(66.67, 2);
    expect(p.bPct).toBeCloseTo(33.33, 2);
  });

  it("3 vs 2 → 60% / 40%", () => {
    const p = computeVotePercentages(3, 2);
    expect([p.aPctDisplay, p.bPctDisplay]).toEqual([60, 40]);
  });

  it("1 normal + 1 boost (weight 6) vs 2 normal (weight 2) → 75% / 25%", () => {
    const p = computeVotePercentages(6, 2);
    expect([p.aPctDisplay, p.bPctDisplay]).toEqual([75, 25]);
    expect([p.aPct, p.bPct]).toEqual([75, 25]);
  });

  it("no votes → 0% / 0%", () => {
    const p = computeVotePercentages(0, 0);
    expect([p.aPct, p.bPct, p.aPctDisplay, p.bPctDisplay]).toEqual([0, 0, 0, 0]);
  });

  it("percentages always sum to exactly 100 for any non-zero totals", () => {
    for (let a = 0; a <= 23; a++) {
      for (let b = 0; b <= 23; b++) {
        if (a + b === 0) continue;
        const p = computeVotePercentages(a, b);
        expect(p.aPctDisplay + p.bPctDisplay).toBe(100);
        expect(p.aPct + p.bPct).toBeCloseTo(100, 2);
      }
    }
  });

  it("ignores garbage inputs (negative / NaN → 0)", () => {
    const p = computeVotePercentages(-3, Number.NaN);
    expect(p.totalWeight).toBe(0);
    expect([p.aPct, p.bPct]).toEqual([0, 0]);
  });
});

describe("buildVoteTotals", () => {
  it("flags boost when weighted totals differ from raw counts", () => {
    const t = buildVoteTotals({ a_weight: 6, b_weight: 2, a_votes: 2, b_votes: 2 });
    expect(t.boosted).toBe(true);
    expect([t.aPctDisplay, t.bPctDisplay]).toEqual([75, 25]);
  });

  it("no boost flag when weights equal counts", () => {
    const t = buildVoteTotals({ a_weight: 2, b_weight: 1, a_votes: 2, b_votes: 1 });
    expect(t.boosted).toBe(false);
  });

  it("handles null rows as empty", () => {
    const t = buildVoteTotals(null);
    expect(t.totalWeight).toBe(0);
    expect(validateVoteTotals(t)).toBe(true);
  });
});

describe("validateVoteTotals — broadcast gate", () => {
  it("accepts consistent totals", () => {
    expect(validateVoteTotals(buildVoteTotals({ a_weight: 3, b_weight: 2, a_votes: 3, b_votes: 2 }))).toBe(true);
  });

  it("rejects tampered totals that no longer add up", () => {
    const t = buildVoteTotals({ a_weight: 3, b_weight: 2, a_votes: 3, b_votes: 2 });
    expect(validateVoteTotals({ ...t, totalWeight: 6 })).toBe(false);
    expect(validateVoteTotals({ ...t, aPct: 80 })).toBe(false);
    expect(validateVoteTotals({ ...t, aPctDisplay: 61 })).toBe(false);
  });
});

describe("formatVoteDebugLog", () => {
  it("prints the requirement-7 block", () => {
    const t = buildVoteTotals({ a_weight: 2, b_weight: 1, a_votes: 2, b_votes: 1 });
    const log = formatVoteDebugLog("round-1", t);
    expect(log).toContain("Round: round-1");
    expect(log).toContain("Artist A Weight: 2 | Artist B Weight: 1 | Total Weight: 3");
    expect(log).toContain("Artist A %: 66.67 | Artist B %: 33.33 | Sum: 100%");
  });
});
