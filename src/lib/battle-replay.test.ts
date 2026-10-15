import { describe, expect, it } from "vitest";
import { formatCountdown, replayStatus, replayWinner } from "./battle-replay";

const now = Date.parse("2026-10-15T12:00:00Z");

describe("battle replay voting", () => {
  it("is LIVE while the battle is running", () => {
    expect(replayStatus({ matchStatus: "live", votingEndsAt: null, finalizedAt: null, nowMs: now })).toBe("LIVE");
  });
  it("is VOTING OPEN before the 24h window ends", () => {
    expect(replayStatus({ matchStatus: "completed", votingEndsAt: "2026-10-15T12:00:01Z", finalizedAt: null, nowMs: now })).toBe("VOTING OPEN");
  });
  it("is FINAL once the 24h window passes, even before finalization runs", () => {
    expect(replayStatus({ matchStatus: "completed", votingEndsAt: "2026-10-15T12:00:00Z", finalizedAt: null, nowMs: now })).toBe("FINAL");
  });
  it("picks the higher total as winner", () => {
    expect(replayWinner(5, 3)).toBe("a");
    expect(replayWinner(2, 9)).toBe("b");
  });
  it("shows a tie when totals are equal", () => {
    expect(replayWinner(4, 4)).toBe("tie");
  });
  it("formats the countdown", () => {
    expect(formatCountdown(24 * 3600 * 1000)).toBe("24:00:00");
    expect(formatCountdown(-5)).toBe("00:00:00");
  });
});
