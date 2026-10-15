export const REPLAY_VOTING_HOURS = 24;

export type ReplayStatus = "LIVE" | "VOTING OPEN" | "FINAL";

/** Status is derived from server timestamps so it is exact even before the hourly finalizer runs. */
export function replayStatus(opts: {
  matchStatus: string;
  votingEndsAt: string | null;
  finalizedAt: string | null;
  nowMs: number;
}): ReplayStatus {
  if (opts.matchStatus !== "completed") return "LIVE";
  if (opts.finalizedAt) return "FINAL";
  if (!opts.votingEndsAt) return "FINAL";
  return new Date(opts.votingEndsAt).getTime() > opts.nowMs ? "VOTING OPEN" : "FINAL";
}

export function replayWinner(aVotes: number, bVotes: number): "a" | "b" | "tie" {
  if (aVotes > bVotes) return "a";
  if (bVotes > aVotes) return "b";
  return "tie";
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
