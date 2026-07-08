import { describe, expect, it } from "vitest";
import { estimateClockOffsetMs, serverMsToCtxTime } from "./audio-clock";

describe("serverMsToCtxTime", () => {
  it("maps a future server moment onto the AudioContext timeline", () => {
    // Client clock == server clock (offset 0): an event 2s in the future is
    // ctx.currentTime + 2.
    const nowMs = 1_000_000;
    const t = serverMsToCtxTime(nowMs + 2000, 0, nowMs, 10);
    expect(t).toBeCloseTo(12);
  });

  it("accounts for the client clock being behind the server", () => {
    // Server is 500ms ahead of the client. A server moment "serverNow + 1000"
    // is only 500ms away on the local clock.
    const nowMs = 1_000_000;
    const serverNow = nowMs + 500;
    const t = serverMsToCtxTime(serverNow + 1000, 500, nowMs, 10);
    expect(t).toBeCloseTo(11);
  });

  it("past moments map before currentTime (late-join offsets)", () => {
    const nowMs = 1_000_000;
    const t = serverMsToCtxTime(nowMs - 30_000, 0, nowMs, 100);
    expect(t).toBeCloseTo(70);
  });
});

describe("estimateClockOffsetMs", () => {
  it("zero offset when clocks agree and RTT is symmetric", () => {
    // sent at 1000, server stamped 1050, received at 1100 (RTT 100).
    expect(estimateClockOffsetMs(1050, 1000, 1100)).toBeCloseTo(0);
  });

  it("positive offset when the server is ahead", () => {
    // Server 500ms ahead: stamped 1550 mid-flight of the same round trip.
    expect(estimateClockOffsetMs(1550, 1000, 1100)).toBeCloseTo(500);
  });

  it("tolerates a zero-RTT observation", () => {
    expect(estimateClockOffsetMs(2000, 1000, 1000)).toBeCloseTo(1000);
  });
});
