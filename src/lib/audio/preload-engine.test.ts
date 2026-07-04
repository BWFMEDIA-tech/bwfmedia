import { describe, expect, it } from "vitest";
import { preloadQueue } from "./preload-engine";
import type { TrackAudioSource } from "./track-loader";

const track = (id: string): TrackAudioSource => ({ trackId: id, audioUrl: `https://x/${id}` });
const fakeBuffer = (id: string) => ({ id }) as unknown as AudioBuffer;

describe("preloadQueue", () => {
  it("loads every track and reports progress", async () => {
    const progress: Array<[number, number]> = [];
    const { buffers, failed } = await preloadQueue(
      [track("a"), track("b"), track("c")],
      async (t) => fakeBuffer(t.trackId),
      { onProgress: (l, t) => progress.push([l, t]) },
    );
    expect(buffers.size).toBe(3);
    expect(failed).toEqual([]);
    expect(progress[progress.length - 1]).toEqual([3, 3]);
  });

  it("a failed track never rejects the preload — it becomes a silent slot", async () => {
    const { buffers, failed } = await preloadQueue(
      [track("ok1"), track("bad"), track("ok2")],
      async (t) => {
        if (t.trackId === "bad") throw new Error("404");
        return fakeBuffer(t.trackId);
      },
    );
    expect(failed).toEqual(["bad"]);
    expect(buffers.has("ok1")).toBe(true);
    expect(buffers.has("ok2")).toBe(true);
    expect(buffers.has("bad")).toBe(false);
  });

  it("respects the concurrency cap", async () => {
    let inFlight = 0;
    let peak = 0;
    await preloadQueue(
      Array.from({ length: 8 }, (_, i) => track(`t${i}`)),
      async (t) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight -= 1;
        return fakeBuffer(t.trackId);
      },
      { concurrency: 2 },
    );
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("stops picking up new work when aborted", async () => {
    const controller = new AbortController();
    let loads = 0;
    const result = await preloadQueue(
      Array.from({ length: 6 }, (_, i) => track(`t${i}`)),
      async (t) => {
        loads += 1;
        if (loads === 2) controller.abort();
        await new Promise((r) => setTimeout(r, 2));
        return fakeBuffer(t.trackId);
      },
      { concurrency: 1, signal: controller.signal },
    );
    expect(loads).toBeLessThan(6);
    expect(result.buffers.size).toBe(loads);
  });
});
