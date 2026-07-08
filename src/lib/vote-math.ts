/**
 * Pure math for battle vote percentages. Single source of truth used by the
 * server (getBattleRoomState / castBattleVote) — the client renders these
 * numbers verbatim and never derives percentages from cached state.
 */

export type VoteTotals = {
  aWeight: number;
  bWeight: number;
  totalWeight: number;
  aVotes: number;
  bVotes: number;
  /** Exact percentages, 2 decimals; always sum to 100 (or both 0). */
  aPct: number;
  bPct: number;
  /** Integer display percentages; always sum to 100 (or both 0). */
  aPctDisplay: number;
  bPctDisplay: number;
  /** True when weighted totals differ from raw vote counts (Investor Boost). */
  boosted: boolean;
};

const asCount = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : 0;
  return v > 0 ? v : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * artistAPercent = totalWeight === 0 ? 0 : (aWeight / totalWeight) * 100 —
 * with B as the exact complement so the pair always sums to 100.
 */
export function computeVotePercentages(aWeightRaw: number, bWeightRaw: number): {
  aPct: number;
  bPct: number;
  aPctDisplay: number;
  bPctDisplay: number;
  totalWeight: number;
} {
  const aWeight = asCount(aWeightRaw);
  const bWeight = asCount(bWeightRaw);
  const totalWeight = aWeight + bWeight;
  if (totalWeight === 0) {
    return { aPct: 0, bPct: 0, aPctDisplay: 0, bPctDisplay: 0, totalWeight: 0 };
  }
  const aPct = round2((aWeight / totalWeight) * 100);
  const bPct = round2(100 - aPct);
  const aPctDisplay = Math.round((aWeight / totalWeight) * 100);
  const bPctDisplay = 100 - aPctDisplay;
  return { aPct, bPct, aPctDisplay, bPctDisplay, totalWeight };
}

/** Build display totals from a DB row of live SUMs over accepted votes. */
export function buildVoteTotals(row: {
  a_weight?: number | null;
  b_weight?: number | null;
  a_votes?: number | null;
  b_votes?: number | null;
} | null | undefined): VoteTotals {
  const aWeight = asCount(row?.a_weight);
  const bWeight = asCount(row?.b_weight);
  const aVotes = asCount(row?.a_votes);
  const bVotes = asCount(row?.b_votes);
  const pct = computeVotePercentages(aWeight, bWeight);
  return {
    aWeight,
    bWeight,
    totalWeight: pct.totalWeight,
    aVotes,
    bVotes,
    aPct: pct.aPct,
    bPct: pct.bPct,
    aPctDisplay: pct.aPctDisplay,
    bPctDisplay: pct.bPctDisplay,
    boosted: aWeight !== aVotes || bWeight !== bVotes,
  };
}

export function emptyVoteTotals(): VoteTotals {
  return buildVoteTotals(null);
}

/**
 * Broadcast gate: totals are internally consistent iff the weights add up
 * and the percentages sum to 100 (or everything is zero). Callers must not
 * render totals that fail this — recalculate from the database instead.
 */
export function validateVoteTotals(t: VoteTotals): boolean {
  if (t.totalWeight !== t.aWeight + t.bWeight) return false;
  if (t.aWeight < 0 || t.bWeight < 0 || t.aVotes < 0 || t.bVotes < 0) return false;
  if (t.totalWeight === 0) {
    return t.aPct === 0 && t.bPct === 0 && t.aPctDisplay === 0 && t.bPctDisplay === 0;
  }
  if (Math.abs(t.aPct + t.bPct - 100) > 0.011) return false;
  if (t.aPctDisplay + t.bPctDisplay !== 100) return false;
  return true;
}

/** Requirement-7 debug block, logged after every accepted vote. */
export function formatVoteDebugLog(roundId: string, t: VoteTotals): string {
  return [
    `Round: ${roundId}`,
    `Artist A Weight: ${t.aWeight} | Artist B Weight: ${t.bWeight} | Total Weight: ${t.totalWeight}`,
    `Artist A %: ${t.aPct.toFixed(2)} | Artist B %: ${t.bPct.toFixed(2)} | Sum: ${
      t.totalWeight === 0 ? "0%" : "100%"
    }`,
  ].join("\n");
}
