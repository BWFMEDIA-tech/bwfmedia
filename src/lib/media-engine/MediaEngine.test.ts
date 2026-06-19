import { describe, it, expect, beforeEach, vi } from "vitest";
import { MediaEngine } from "./MediaEngine";

/**
 * These tests pin the no-rebuild invariant: toggling Stage/Broadcast/Stream
 * or changing output settings while streaming MUST NOT
 *   - call getUserMedia / getDisplayMedia again
 *   - create a new AudioContext / master GainNode / destination
 *   - swap the cached MediaStream references
 *   - stop any media tracks
 */

type FakeTrack = { kind: "audio" | "video"; enabled: boolean; stop: ReturnType<typeof vi.fn>; addEventListener: () => void };

function makeTrack(kind: "audio" | "video"): FakeTrack {
  return { kind, enabled: true, stop: vi.fn(), addEventListener: () => {} };
}
function makeStream(tracks: FakeTrack[]) {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  } as unknown as MediaStream;
}

function installFakeAudio() {
  let instances = 0;
  const masterGains: any[] = [];
  const destinations: any[] = [];
  class FakeAudioContext {
    public destinationStream = { id: `dest-${++instances}` };
    public instanceId = instances;
    createGain() {
      const g = { gain: { value: 1 }, connect: vi.fn((n: any) => n), disconnect: vi.fn() };
      masterGains.push(g);
      return g;
    }
    createMediaStreamDestination() {
      const d = { stream: this.destinationStream, connect: vi.fn() };
      destinations.push(d);
      return d;
    }
    createAnalyser() {
      return {
        fftSize: 1024,
        connect: vi.fn(),
        getByteTimeDomainData: (buf: Uint8Array) => buf.fill(128),
      };
    }
    createMediaStreamSource() {
      return { connect: (n: any) => n, disconnect: vi.fn() };
    }
    close() {}
  }
  (globalThis as any).AudioContext = FakeAudioContext;
  (globalThis as any).window = globalThis;
  (globalThis as any).requestAnimationFrame = (_cb: any) => 0;
  (globalThis as any).cancelAnimationFrame = () => {};
  return { masterGains, destinations, getInstanceCount: () => instances };
}

function installFakeMedia() {
  const micStream = makeStream([makeTrack("audio")]);
  const camStream = makeStream([makeTrack("video")]);
  const screenStream = makeStream([makeTrack("video"), makeTrack("audio")]);
  const getUserMedia = vi.fn(async (c: any) => (c.video ? camStream : micStream));
  const getDisplayMedia = vi.fn(async () => screenStream);
  (globalThis as any).navigator = {
    mediaDevices: { getUserMedia, getDisplayMedia },
  };
  return { micStream, camStream, screenStream, getUserMedia, getDisplayMedia };
}

describe("MediaEngine — no-rebuild invariants", () => {
  let audio: ReturnType<typeof installFakeAudio>;
  let media: ReturnType<typeof installFakeMedia>;
  let engine: MediaEngine;

  beforeEach(() => {
    audio = installFakeAudio();
    media = installFakeMedia();
    engine = new MediaEngine();
  });

  it("ensureAudio() is idempotent — one AudioContext for the session", () => {
    const a = engine.ensureAudio();
    const b = engine.ensureAudio();
    expect(a).toBe(b);
    expect(audio.getInstanceCount()).toBe(1);
  });

  it("toggling Stage ON/OFF/ON does not reacquire mic or rebuild audio graph", async () => {
    await engine.acquireMic();
    const ctxBefore = engine.ensureAudio();
    const micBefore = (engine as any).micStream;

    engine.setStageEnabled(true);
    engine.setStageEnabled(false);
    engine.setStageEnabled(true);

    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(engine.ensureAudio()).toBe(ctxBefore);
    expect((engine as any).micStream).toBe(micBefore);
    expect(audio.getInstanceCount()).toBe(1);
    // No tracks were stopped
    expect(media.micStream.getAudioTracks()[0].stop).not.toHaveBeenCalled();
  });

  it("toggling Broadcast ON/OFF/ON does not reacquire camera or stop tracks", async () => {
    await engine.acquireCamera();
    const camBefore = (engine as any).cameraStream;

    engine.setBroadcastEnabled(true);
    engine.setBroadcastEnabled(false);
    engine.setBroadcastEnabled(true);

    // Only 1 getUserMedia call (the initial camera acquire).
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect((engine as any).cameraStream).toBe(camBefore);
    expect(media.camStream.getVideoTracks()[0].stop).not.toHaveBeenCalled();
  });

  it("alternating Stage and Broadcast keeps mixer and streams intact", async () => {
    await engine.acquireMic();
    await engine.acquireCamera();
    const ctx = engine.ensureAudio();
    const masterCount = audio.masterGains.length;
    const destCount = audio.destinations.length;

    for (let i = 0; i < 5; i++) {
      engine.setStageEnabled(i % 2 === 0);
      engine.setBroadcastEnabled(i % 2 === 1);
    }

    expect(engine.ensureAudio()).toBe(ctx);
    expect(audio.masterGains.length).toBe(masterCount); // no new master gain
    expect(audio.destinations.length).toBe(destCount);
    expect(media.getUserMedia).toHaveBeenCalledTimes(2); // mic + camera, never again
  });

  it("changing output settings while streaming does not rebuild the pipeline", async () => {
    await engine.acquireCamera();
    engine.setBroadcastEnabled(true);
    const ctx = engine.ensureAudio();
    const camBefore = (engine as any).cameraStream;

    engine.setOutputSettings({ protocol: "srt", bitrateKbps: 6000, url: "srt://x", streamKey: "k" });
    engine.setOutputSettings({ protocol: "webrtc", resolution: "1280x720", fps: 60 });

    expect(engine.getState().streaming).toBe(true);
    expect(engine.getState().output.protocol).toBe("webrtc");
    expect(engine.getState().bitrateKbps).toBe(6000);
    expect(engine.ensureAudio()).toBe(ctx);
    expect((engine as any).cameraStream).toBe(camBefore);
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(media.camStream.getVideoTracks()[0].stop).not.toHaveBeenCalled();
  });

  it("Stream ON/OFF via setBroadcastEnabled does not stop or replace any tracks", async () => {
    await engine.acquireMic();
    await engine.acquireCamera();

    engine.setBroadcastEnabled(true);
    engine.setBroadcastEnabled(false);
    engine.setBroadcastEnabled(true);
    engine.setBroadcastEnabled(false);

    expect(media.micStream.getAudioTracks()[0].stop).not.toHaveBeenCalled();
    expect(media.camStream.getVideoTracks()[0].stop).not.toHaveBeenCalled();
  });
});