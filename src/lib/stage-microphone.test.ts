import { describe, expect, it } from "vitest";
import { canToggleStageMicrophone, shouldRestoreStageMicrophone } from "./stage-microphone";

describe("stage self mute", () => {
  it("lets every publishing stage participant mute and unmute their own mic", () => {
    expect(canToggleStageMicrophone(true, true, false)).toBe(true);
    expect(canToggleStageMicrophone(false, true, false)).toBe(true);
  });
  it("does not let a participant unmute past host moderation", () => {
    expect(canToggleStageMicrophone(false, true, true)).toBe(false);
    expect(canToggleStageMicrophone(true, true, true)).toBe(true);
  });
  it("does not grant a listener microphone publishing", () => {
    expect(canToggleStageMicrophone(false, false, false)).toBe(false);
  });
  it("does not undo a participant's muted microphone during recovery", () => {
    expect(shouldRestoreStageMicrophone([{ source: "microphone", track: { isMuted: true, mediaStreamTrack: { readyState: "ended" } } }])).toBe(false);
  });
  it("restores a failed unmuted microphone", () => {
    expect(shouldRestoreStageMicrophone([{ source: "microphone", track: { isMuted: false, mediaStreamTrack: { readyState: "ended" } } }])).toBe(true);
    expect(shouldRestoreStageMicrophone([])).toBe(true);
  });
});