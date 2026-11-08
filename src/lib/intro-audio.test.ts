import { describe, expect, it, vi } from "vitest";
import { enableIntroAudio, playIntroWithFallback } from "./intro-audio";

describe("intro audio", () => {
  it("keeps automatic playback running muted when mobile blocks sound", async () => {
    const video = { muted: false, volume: 0.5, currentTime: 2, play: vi.fn().mockRejectedValueOnce(new Error("NotAllowedError")).mockResolvedValueOnce(undefined) };
    expect(await playIntroWithFallback(video, () => true)).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.currentTime).toBe(2);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it("enables sound on a tap without restarting the intro", async () => {
    const video = { muted: true, volume: 0, currentTime: 2.75, play: vi.fn().mockResolvedValue(undefined) };
    expect(await enableIntroAudio(video)).toBe(true);
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(1);
    expect(video.currentTime).toBe(2.75);
  });

  it("does not let a stale autoplay rejection remute tap-enabled audio", async () => {
    let rejectAutoplay: ((reason: Error) => void) | undefined;
    const video = { muted: false, volume: 1, play: vi.fn().mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectAutoplay = reject; })).mockResolvedValue(undefined) };
    let tapped = false;
    const autoplay = playIntroWithFallback(video, () => !tapped);
    tapped = true;
    await enableIntroAudio(video);
    rejectAutoplay?.(new Error("NotAllowedError"));
    await autoplay;
    expect(video.muted).toBe(false);
    expect(video.play).toHaveBeenCalledTimes(2);
  });
});