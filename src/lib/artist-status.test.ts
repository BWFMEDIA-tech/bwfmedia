import { describe, expect, it } from "vitest";
import { resolveArtistStatus } from "./artist-status";
describe("artist status", () => {
  const now = Date.parse("2026-10-18T22:47:00Z");
  it("live takes priority over offline", () => { expect(resolveArtistStatus(true, undefined, now)).toBe("live"); });
  it("recent logged-in activity is active", () => { expect(resolveArtistStatus(false, { online: true, last_seen_at: new Date(now - 30_000).toISOString() }, now)).toBe("active"); });
  it("stale heartbeats are offline", () => { expect(resolveArtistStatus(false, { online: true, last_seen_at: new Date(now - 120_000).toISOString() }, now)).toBe("offline"); });
  it("signed-out and missing presence are offline", () => { expect(resolveArtistStatus(false, { online: false, last_seen_at: new Date(now).toISOString() }, now)).toBe("offline"); expect(resolveArtistStatus(false, undefined, now)).toBe("offline"); });
});