import { describe, expect, it } from "vitest";
import { shouldRestoreStageMicrophone } from "./stage-microphone";

describe("stage self mute", () => {
  it("does not undo a participant's muted microphone during recovery", () => {
    expect(shouldRestoreStageMicrophone([{ source: "microphone", track: { isMuted: true, mediaStreamTrack: { readyState: "ended" } } }])).toBe(false);
  });
  it("restores a failed unmuted microphone", () => {
    expect(shouldRestoreStageMicrophone([{ source: "microphone", track: { isMuted: false, mediaStreamTrack: { readyState: "ended" } } }])).toBe(true);
    expect(shouldRestoreStageMicrophone([])).toBe(true);
  });
});