import { describe, expect, it } from "vitest";
import {
  buildSlotSchedule,
  epochFromSyncRow,
  isVotingOpenAt,
  rescheduleFrom,
  slotPositionAt,
} from "./slot-scheduler";

const EPOCH = 1_000_000_000_000;
const QUEUE = [{ trackId: "t1" }, { trackId: "t2" }, { trackId: "t3" }];

describe("buildSlotSchedule", () => {
  it("assigns strict 60s windows: queue[i] -> [i*60, (i+1)*60)", () => {
    const s = buildSlotSchedule(QUEUE, EPOCH);
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ trackId: "t1", startsAtMs: EPOCH, endsAtMs: EPOCH + 60_000 });
    expect(s[1]).toMatchObject({ trackId: "t2", startsAtMs: EPOCH + 60_000, endsAtMs: EPOCH + 120_000 });
    expect(s[2]).toMatchObject({ trackId: "t3", startsAtMs: EPOCH + 120_000, endsAtMs: EPOCH + 180_000 });
  });

  it("voting window covers exactly the slot", () => {
    const s = buildSlotSchedule(QUEUE, EPOCH);
    expect(s[1].votingOpensAtMs).toBe(s[1].startsAtMs);
    expect(s[1].votingLocksAtMs).toBe(s[1].endsAtMs);
  });
});

describe("slotPositionAt", () => {
  const s = buildSlotSchedule(QUEUE, EPOCH);

  it("reports not started before the epoch", () => {
    const p = slotPositionAt(s, EPOCH - 1);
    expect(p.notStarted).toBe(true);
    expect(p.index).toBe(-1);
  });

  it("slot boundaries are half-open: 59.999s is slot 0, 60s is slot 1", () => {
    expect(slotPositionAt(s, EPOCH + 59_999).index).toBe(0);
    expect(slotPositionAt(s, EPOCH + 60_000).index).toBe(1);
  });

  it("reports offset and remaining inside a slot", () => {
    const p = slotPositionAt(s, EPOCH + 75_000);
    expect(p.index).toBe(1);
    expect(p.offsetSec).toBeCloseTo(15);
    expect(p.remainingSec).toBeCloseTo(45);
  });

  it("reports ended at/after the final slot end", () => {
    expect(slotPositionAt(s, EPOCH + 180_000).ended).toBe(true);
    expect(slotPositionAt(s, EPOCH + 999_999).ended).toBe(true);
  });

  it("empty schedule is both not-started and ended", () => {
    const p = slotPositionAt([], EPOCH);
    expect(p.notStarted).toBe(true);
    expect(p.ended).toBe(true);
  });
});

describe("isVotingOpenAt", () => {
  const s = buildSlotSchedule(QUEUE, EPOCH);
  it("open during the slot, locked exactly at slot end", () => {
    expect(isVotingOpenAt(s[0], EPOCH)).toBe(true);
    expect(isVotingOpenAt(s[0], EPOCH + 59_999)).toBe(true);
    expect(isVotingOpenAt(s[0], EPOCH + 60_000)).toBe(false);
  });
});

describe("rescheduleFrom (vote-driven early transition)", () => {
  const s = buildSlotSchedule(QUEUE, EPOCH);

  it("ends the slot early and pulls later slots forward, lengths preserved", () => {
    const early = EPOCH + 40_000; // end slot 0 at 40s
    const r = rescheduleFrom(s, 0, early);
    expect(r[0].endsAtMs).toBe(early);
    expect(r[0].votingLocksAtMs).toBe(early);
    expect(r[1].startsAtMs).toBe(early);
    expect(r[1].endsAtMs).toBe(early + 60_000);
    expect(r[2].startsAtMs).toBe(early + 60_000);
  });

  it("clamps the new boundary inside the slot", () => {
    const r = rescheduleFrom(s, 1, EPOCH); // before slot 1 starts
    expect(r[1].endsAtMs).toBe(r[1].startsAtMs);
    const r2 = rescheduleFrom(s, 1, EPOCH + 999_999); // after slot 1 ends
    expect(r2[1].endsAtMs).toBe(EPOCH + 120_000);
  });

  it("leaves earlier slots untouched", () => {
    const r = rescheduleFrom(s, 1, EPOCH + 90_000);
    expect(r[0]).toEqual(s[0]);
  });
});

describe("epochFromSyncRow", () => {
  it("derives the same epoch every client will derive", () => {
    const epoch = epochFromSyncRow(new Date(EPOCH + 12_500).toISOString(), 12.5);
    expect(epoch).toBe(EPOCH);
  });

  it("round-trips a freshly published row (position 0 lead-in)", () => {
    const published = new Date(EPOCH).toISOString();
    expect(epochFromSyncRow(published, -3)).toBe(EPOCH + 3000); // 3s lead-in
  });
});
