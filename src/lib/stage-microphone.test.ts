import { describe, expect, it } from "vitest";
import { activeMutedUserIds, canToggleStageMicrophone, shouldRestoreStageMicrophone } from "./stage-microphone";

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

describe("host mute enforcement", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  it("lists only users whose mute is still in effect", () => {
    const ids = activeMutedUserIds([
      { user_id: "a", muted_until: future },
      { user_id: "b", muted_until: past },
      { user_id: "c", muted_until: null },
    ]);
    expect([...ids]).toEqual(["a"]);
  });
  it("treats the host's far-future mute marker as muted", () => {
    const ids = activeMutedUserIds([{ user_id: "a", muted_until: "9999-12-31T00:00:00.000Z" }]);
    expect(ids.has("a")).toBe(true);
  });
  it("returns an empty set when nobody is muted", () => {
    expect(activeMutedUserIds([]).size).toBe(0);
  });
});