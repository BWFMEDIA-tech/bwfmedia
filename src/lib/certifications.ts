export const CERT_LEVELS = [
  { key: "bronze", label: "Bronze", threshold: 15_000_000 },
  { key: "silver", label: "Silver", threshold: 25_000_000 },
  { key: "gold", label: "Gold", threshold: 75_000_000 },
  { key: "platinum", label: "Platinum", threshold: 150_000_000 },
  { key: "diamond", label: "Diamond", threshold: 1_500_000_000 },
] as const;
export type CertLevel = (typeof CERT_LEVELS)[number]["key"];

/** Next unreached milestone and progress toward it from real stream totals. */
export function milestoneProgress(streams: number) {
  const next = CERT_LEVELS.find((l) => streams < l.threshold) ?? null;
  if (!next) return { next: null, percent: 100, remaining: 0 };
  const percent = Math.min(100, Math.floor((streams / next.threshold) * 100));
  return { next, percent, remaining: next.threshold - streams };
}

export function eligibleLevels(streams: number): CertLevel[] {
  return CERT_LEVELS.filter((l) => streams >= l.threshold).map((l) => l.key);
}

export function compactStreams(n: number) {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return String(n);
}
