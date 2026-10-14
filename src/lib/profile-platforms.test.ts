import { describe, expect, it } from "vitest";
import { PROFILE_PLATFORMS, safePlatformUrl } from "./profile-platforms";

describe("profile platform links", () => {
  it("supports the five requested platforms", () => {
    expect(PROFILE_PLATFORMS.map(p => p.label)).toEqual(["Twitch", "YouTube", "Facebook", "TikTok", "Kick"]);
  });
  it.each(PROFILE_PLATFORMS)("accepts $label profile links", p => {
    expect(safePlatformUrl(p.key, p.placeholder)).toBe(p.placeholder);
  });
  it("rejects executable links and lookalike hosts", () => {
    expect(safePlatformUrl("twitch", "javascript:alert(1)")).toBeNull();
    expect(safePlatformUrl("twitch", "https://twitch.tv.evil.test/name")).toBeNull();
    expect(safePlatformUrl("kick", "https://user:password@kick.com/name")).toBeNull();
  });
});