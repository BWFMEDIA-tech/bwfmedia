import { describe, expect, it } from "vitest";
import { validPushEndpoint, pushAllowed, pushLink } from "./web-push";
const p = { push: true, live_alerts: true, battle_alerts: true, message_alerts: true, follower_alerts: true, music_alerts: true };
describe("mobile push security and preferences", () => {
  it("permits Apple and Android push services only", () => {
    expect(validPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(validPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    for (const endpoint of ["http://fcm.googleapis.com/a", "https://localhost/a", "https://fcm.googleapis.com.evil.com/a", "https://fcm.googleapis.com:123/a", "https://user@fcm.googleapis.com/a"]) expect(validPushEndpoint(endpoint)).toBe(false);
  });
  it("requires explicit saved opt-in", () => { expect(pushAllowed("battle_challenge", null)).toBe(false); expect(pushAllowed("battle_challenge", { ...p, push: false })).toBe(false); });
  for (const [type, preference] of [["battle_challenge", "battle_alerts"], ["direct_message", "message_alerts"], ["new_follower", "follower_alerts"], ["new_music", "music_alerts"], ["announcement_event", "live_alerts"]] as const) {
    it(`respects ${preference}`, () => { expect(pushAllowed(type, p)).toBe(true); expect(pushAllowed(type, { ...p, [preference]: false })).toBe(false); });
  }
  it("clicks stay on Tunevio", () => { expect(pushLink("/messages?to=123")).toBe("/messages?to=123"); for (const link of ["//evil.com", "https://evil.com", "/\\evil.com"]) expect(pushLink(link)).toBe("/notifications"); });
});