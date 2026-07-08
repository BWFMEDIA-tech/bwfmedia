/**
 * Global audio clock for Tunevio Arena.
 *
 * Owns the ONE AudioContext the whole app shares (every extra context costs
 * ~5–10% CPU on mobile — see useSharedAudioGraph, which now imports this
 * singleton) and maps server wall-clock time onto AudioContext time so all
 * clients schedule playback against the same timeline.
 *
 * Timing model:
 *  - AudioContext.currentTime is the local high-precision clock; everything
 *    audible is pre-scheduled against it (never setInterval).
 *  - A slot epoch is published as SERVER wall-clock ms (see arena-sync).
 *  - Each client estimates its offset to server time once (RTT-halved) and
 *    converts epoch ms -> ctx time with serverMsToCtxTime(). Cross-client
 *    skew is bounded by the offset estimation error, typically well under
 *    a couple hundred ms; local drift is zero because the AudioContext
 *    hardware clock drives the actual audio.
 */

let sharedCtx: AudioContext | null = null;

/** SSR-safe accessor for the app-wide AudioContext singleton. */
export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx) return sharedCtx;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  sharedCtx = new Ctor();
  return sharedCtx;
}

/** Resume the shared context — must be called from a user gesture. */
export function resumeAudioContext(): void {
  if (sharedCtx && sharedCtx.state === "suspended") {
    void sharedCtx.resume();
  }
}

/**
 * Pure conversion: the AudioContext time at which a server wall-clock moment
 * occurs. offsetMs is (serverNow - clientNow); nowMs/nowCtx are a paired
 * observation of Date.now() and ctx.currentTime.
 */
export function serverMsToCtxTime(
  serverMs: number,
  offsetMs: number,
  nowMs: number,
  nowCtx: number,
): number {
  const clientMs = serverMs - offsetMs; // when that server moment is on the local clock
  return nowCtx + (clientMs - nowMs) / 1000;
}

/** Pure offset estimation from a request/response round trip. */
export function estimateClockOffsetMs(
  serverReportedMs: number,
  requestSentAtMs: number,
  responseReceivedAtMs: number,
): number {
  const rtt = Math.max(0, responseReceivedAtMs - requestSentAtMs);
  // The server stamped roughly mid-flight; align it to the midpoint.
  return serverReportedMs + rtt / 2 - responseReceivedAtMs;
}

export class ArenaAudioClock {
  private offsetMs = 0;
  private synced = false;

  constructor(private readonly ctx: AudioContext) {}

  get isSynced(): boolean {
    return this.synced;
  }

  get clockOffsetMs(): number {
    return this.offsetMs;
  }

  /** Feed one server-time observation (see estimateClockOffsetMs). */
  setOffsetMs(offsetMs: number): void {
    this.offsetMs = offsetMs;
    this.synced = true;
  }

  /** Best estimate of the current server wall-clock time. */
  serverNowMs(): number {
    return Date.now() + this.offsetMs;
  }

  /** AudioContext time corresponding to a server wall-clock ms. */
  ctxTimeForServerMs(serverMs: number): number {
    return serverMsToCtxTime(serverMs, this.offsetMs, Date.now(), this.ctx.currentTime);
  }
}
