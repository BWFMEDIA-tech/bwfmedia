import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("Arena microphone and playback isolation", () => {
  async function setup(state = "running") {
    const resume = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const context = { state, currentTime: 42, resume, close };
    const ctor = vi.fn(function () { return context; });
    vi.stubGlobal("window", { AudioContext: ctor });
    const options = await import("./arena-room-audio");
    const clock = await import("./audio/audio-clock");
    return { ...options, ...clock, context, ctor, resume, close };
  }

  it("shares one hardware clock without closing or resetting music when mic options are read", async () => {
    const api = await setup();
    const first = api.getArenaRoomAudioOptions();
    const second = api.getArenaRoomAudioOptions();
    expect(first.webAudioMix).toEqual({ audioContext: api.getSharedAudioContext() });
    expect(second.webAudioMix).toEqual(first.webAudioMix);
    expect(api.ctor).toHaveBeenCalledTimes(1);
    expect(api.context.currentTime).toBe(42);
    expect(api.close).not.toHaveBeenCalled();
  });

  it("stops mic capture on mute and retains echo cancellation without gain pumping or voice isolation", async () => {
    const api = await setup();
    const options = api.getArenaRoomAudioOptions();
    expect(options.publishDefaults?.stopMicTrackOnMute).toBe(true);
    expect(options.audioCaptureDefaults).toEqual({
      echoCancellation: true, noiseSuppression: true,
      autoGainControl: false, voiceIsolation: false,
    });
  });

  it("resumes an iOS interrupted context without creating a new context or resetting its timeline", async () => {
    const api = await setup("interrupted");
    api.getSharedAudioContext();
    api.resumeAudioContext();
    expect(api.resume).toHaveBeenCalledTimes(1);
    expect(api.ctor).toHaveBeenCalledTimes(1);
    expect(api.context.currentTime).toBe(42);
  });

  it("does not resume already-running music", async () => {
    const api = await setup();
    api.getSharedAudioContext();
    api.resumeAudioContext();
    expect(api.resume).not.toHaveBeenCalled();
  });
});