import { describe, expect, it } from "vitest";
import { ArenaSlotEngine, type SlotClock } from "./arena-slot-engine";

/**
 * The engine is exercised against a fully mocked AudioContext + clock, so
 * these tests assert the SCHEDULING DECISIONS (which sources start, when,
 * at what offset, with what envelope end) — the part real browsers can't
 * cover deterministically in CI.
 */

type Call = { fn: string; args: number[] };

function fakeGain() {
  const calls: Call[] = [];
  return {
    calls,
    gain: {
      value: 1,
      setValueAtTime: (v: number, t: number) => calls.push({ fn: "set", args: [v, t] }),
      linearRampToValueAtTime: (v: number, t: number) => calls.push({ fn: "ramp", args: [v, t] }),
      cancelScheduledValues: (t: number) => calls.push({ fn: "cancel", args: [t] }),
    },
    connect: () => undefined,
    disconnect: () => undefined,
  };
}

function fakeSource() {
  const started: Array<[number, number | undefined]> = [];
  const stopped: number[] = [];
  return {
    started,
    stopped,
    buffer: null as unknown,
    connect: () => undefined,
    disconnect: () => undefined,
    start: (when: number, offset?: number) => started.push([when, offset]),
    stop: (when?: number) => stopped.push(when ?? -1),
  };
}

function makeCtx(currentTime = 100) {
  const sources: ReturnType<typeof fakeSource>[] = [];
  const gains: ReturnType<typeof fakeGain>[] = [];
  const ctx = {
    currentTime,
    destination: {},
    createGain: () => {
      const g = fakeGain();
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const s = fakeSource();
      sources.push(s);
      return s;
    },
  } as unknown as AudioContext;
  return { ctx, sources, gains };
}

const EPOCH = 5_000_000;

/** Deterministic clock: server time is frozen at nowMs; epoch maps so that
 *  ctxTime(serverMs) = 100 + (serverMs - nowMs)/1000. */
function makeClock(nowMs: number): SlotClock {
  return {
    serverNowMs: () => nowMs,
    ctxTimeForServerMs: (serverMs: number) => 100 + (serverMs - nowMs) / 1000,
  };
}

const buf = (durationSec: number) => ({ duration: durationSec }) as AudioBuffer;

const QUEUE = [{ trackId: "t1" }, { trackId: "t2" }, { trackId: "t3" }];

function buffers(entries: Record<string, AudioBuffer>) {
  return new Map(Object.entries(entries));
}

describe("ArenaSlotEngine scheduling", () => {
  it("pre-schedules one source per future slot at exact slot starts", () => {
    const { ctx, sources } = makeCtx();
    const engine = new ArenaSlotEngine(ctx, makeClock(EPOCH - 5000)); // 5s before slot 0
    engine.start(QUEUE, buffers({ t1: buf(60), t2: buf(60), t3: buf(60) }), EPOCH);

    // masterGain is gains[0]; per-slot sources follow.
    expect(sources).toHaveLength(3);
    expect(sources[0].started[0][0]).toBeCloseTo(105); // epoch = now+5s → ctx 105
    expect(sources[1].started[0][0]).toBeCloseTo(165);
    expect(sources[2].started[0][0]).toBeCloseTo(225);
    // Strict slots: each source stops just past its own boundary.
    expect(sources[0].stopped[0]).toBeCloseTo(165.05);
    engine.stop();
  });

  it("skips slots that already ended and late-joins the active slot at the right offset", () => {
    const { ctx, sources } = makeCtx();
    // Join 75s after epoch: slot 0 (0-60) is done, slot 1 (60-120) is 15s in.
    const engine = new ArenaSlotEngine(ctx, makeClock(EPOCH + 75_000));
    engine.start(QUEUE, buffers({ t1: buf(60), t2: buf(60), t3: buf(60) }), EPOCH);

    expect(sources).toHaveLength(2); // slot 0 skipped entirely
    const [when, offset] = sources[0].started[0];
    expect(when).toBeCloseTo(100); // starts immediately
    expect(offset).toBeCloseTo(15); // 15 seconds into the track
    // Slot 2 still starts exactly on its boundary (epoch+120s → now+45s).
    expect(sources[1].started[0][0]).toBeCloseTo(145);
    engine.stop();
  });

  it("late join past a short track's end schedules NO source — silence is the synced truth", () => {
    const { ctx, sources } = makeCtx();
    // 45s into slot 0, but the track is only 25s long: it ended 20s ago for
    // everyone. Nothing should start (and nothing should throw).
    const engine = new ArenaSlotEngine(ctx, makeClock(EPOCH + 45_000));
    engine.start([{ trackId: "t1" }], buffers({ t1: buf(25) }), EPOCH);
    const started = sources.filter((s) => s.started.length > 0);
    expect(started).toHaveLength(0);
    engine.stop();
  });

  it("clamps the late-join envelope and stop to the AUDIO end when the track is shorter than the slot", () => {
    const { ctx, sources, gains } = makeCtx();
    // 10s into slot 0 with a 30s track: 20s of audio remain; slot has 50s left.
    const engine = new ArenaSlotEngine(ctx, makeClock(EPOCH + 10_000));
    engine.start([{ trackId: "t1" }], buffers({ t1: buf(30) }), EPOCH);

    expect(sources[0].started[0]).toEqual([100, 10]);
    // Audio ends at ctx 120 (20s remaining), NOT the slot end (ctx 150).
    expect(sources[0].stopped[0]).toBeCloseTo(120.05);
    const slotGain = gains[1]; // gains[0] is the master gain
    const lastRamp = slotGain.calls.filter((c) => c.fn === "ramp").pop();
    expect(lastRamp!.args[0]).toBe(0);
    expect(lastRamp!.args[1]).toBeCloseTo(120);
    engine.stop();
  });

  it("a missing buffer becomes a silent slot without shifting the others", () => {
    const { ctx, sources } = makeCtx();
    const engine = new ArenaSlotEngine(ctx, makeClock(EPOCH - 1000));
    engine.start(QUEUE, buffers({ t1: buf(60), t3: buf(60) }), EPOCH); // t2 failed preload

    expect(sources).toHaveLength(2);
    expect(sources[0].started[0][0]).toBeCloseTo(101); // slot 0 on time
    expect(sources[1].started[0][0]).toBeCloseTo(221); // slot 2 still at epoch+120s
    engine.stop();
  });

  it("stop() tears every node down", () => {
    const { ctx, sources } = makeCtx();
    const engine = new ArenaSlotEngine(ctx, makeClock(EPOCH - 1000));
    engine.start(QUEUE, buffers({ t1: buf(60), t2: buf(60), t3: buf(60) }), EPOCH);
    engine.stop();
    for (const s of sources) {
      expect(s.stopped.length).toBeGreaterThanOrEqual(1);
    }
    expect(engine.currentSchedule).toHaveLength(0);
  });
});
