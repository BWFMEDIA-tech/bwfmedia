import { describe, expect, it } from "vitest";
import {
  applyCrossfade,
  applyEnergyCurve,
  applyMidSlotEnvelope,
  applySlotEnvelope,
  type AudioParamLike,
} from "./crossfade-engine";

type Call = { fn: "set" | "ramp"; value: number; time: number };

function mockParam(): { param: AudioParamLike; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    param: {
      setValueAtTime: (value, time) => calls.push({ fn: "set", value, time }),
      linearRampToValueAtTime: (value, time) => calls.push({ fn: "ramp", value, time }),
    },
  };
}

describe("applySlotEnvelope — the spec's exact 60s envelope", () => {
  it("0 @ start → 1 @ +1 → 1 @ +59 → 0 @ +60", () => {
    const { param, calls } = mockParam();
    applySlotEnvelope(param, 100, 60);
    expect(calls).toEqual([
      { fn: "set", value: 0, time: 100 },
      { fn: "ramp", value: 1, time: 101 },
      { fn: "set", value: 1, time: 159 },
      { fn: "ramp", value: 0, time: 160 },
    ]);
  });

  it("clamps fades for very short slots (early-transition remainder)", () => {
    const { param, calls } = mockParam();
    applySlotEnvelope(param, 0, 1); // 1s slot: fades clamp to 0.5s each
    expect(calls[1].time).toBeCloseTo(0.5);
    expect(calls[3].time).toBeCloseTo(1);
  });
});

describe("applyMidSlotEnvelope — late join", () => {
  it("starts at hold level immediately and schedules only the tail fade", () => {
    const { param, calls } = mockParam();
    applyMidSlotEnvelope(param, 42, 60);
    expect(calls[0]).toEqual({ fn: "set", value: 1, time: 42 });
    expect(calls[calls.length - 1]).toEqual({ fn: "ramp", value: 0, time: 60 });
  });
});

describe("applyCrossfade — spec's DJ boundary blend", () => {
  it("current 1→0 and next 0→1 across the overlap", () => {
    const cur = mockParam();
    const next = mockParam();
    applyCrossfade(cur.param, next.param, 200, 2);
    expect(cur.calls).toEqual([
      { fn: "set", value: 1, time: 200 },
      { fn: "ramp", value: 0, time: 202 },
    ]);
    expect(next.calls).toEqual([
      { fn: "set", value: 0, time: 200 },
      { fn: "ramp", value: 1, time: 202 },
    ]);
  });
});

describe("applyEnergyCurve", () => {
  it("intro ramp, full-energy body, hype lift, and a hard zero at slot end", () => {
    const { param, calls } = mockParam();
    applyEnergyCurve(param, 0, 60);
    expect(calls[0]).toEqual({ fn: "set", value: 0, time: 0 });
    // Ends at exactly 0 at t=60 — the envelope can never bleed into slot 2.
    expect(calls[calls.length - 1]).toEqual({ fn: "ramp", value: 0, time: 60 });
    // Hype lift happens inside the final 10s window.
    const hype = calls.find((c) => c.value > 1);
    expect(hype).toBeDefined();
    expect(hype!.time).toBeGreaterThan(50);
    expect(hype!.time).toBeLessThan(60);
  });
});
