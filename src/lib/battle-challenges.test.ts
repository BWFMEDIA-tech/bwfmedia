import { describe, expect, it } from "vitest";
import {
  CHALLENGE_STATUSES,
  canRespondToChallenge,
  canStartChallenge,
  canCancelChallenge,
  canDeclineChallenge,
} from "@/lib/battle-challenges";

describe("battle challenge lifecycle", () => {
  it("covers every documented status", () => {
    expect(CHALLENGE_STATUSES).toEqual([
      "pending",
      "accepted",
      "declined",
      "scheduled",
      "live",
      "completed",
      "cancelled",
    ]);
  });

  it("only lets the challenged artist answer a pending challenge", () => {
    expect(canRespondToChallenge("pending")).toBe(true);
    for (const s of ["accepted", "declined", "scheduled", "live", "completed", "cancelled"]) {
      expect(canRespondToChallenge(s)).toBe(false);
    }
  });

  it("requires both artists to agree before the host can start", () => {
    // "pending" means the challenged artist has not agreed yet.
    expect(canStartChallenge("pending")).toBe(false);
    expect(canStartChallenge("accepted")).toBe(true);
    expect(canStartChallenge("scheduled")).toBe(true);
    for (const s of ["live", "completed", "declined", "cancelled"]) {
      expect(canStartChallenge(s)).toBe(false);
    }
  });

  it("allows cancellation only before the battle goes live", () => {
    expect(canCancelChallenge("pending")).toBe(true);
    expect(canCancelChallenge("accepted")).toBe(true);
    expect(canCancelChallenge("scheduled")).toBe(true);
    for (const s of ["live", "completed", "declined", "cancelled"]) {
      expect(canCancelChallenge(s)).toBe(false);
    }
  });

  it("lets the host decline only pre-live challenges", () => {
    expect(canDeclineChallenge("pending")).toBe(true);
    expect(canDeclineChallenge("accepted")).toBe(true);
    expect(canDeclineChallenge("scheduled")).toBe(true);
    expect(canDeclineChallenge("live")).toBe(false);
    expect(canDeclineChallenge("completed")).toBe(false);
  });
});
