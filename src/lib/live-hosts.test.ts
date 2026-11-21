import { describe, expect, it } from "vitest";
import { currentLiveHosts } from "./live-hosts";

describe("Music Live Hosts", () => {
  it("includes every active broadcaster without account-role exclusions or a card limit", () => {
    const entries = Array.from({ length: 101 }, (_, i) => ({ host_id: `host-${i}`, status: "live", started_at: null }));
    expect(currentLiveHosts(entries)).toHaveLength(101);
  });
  it("excludes ended, scheduled and offline sessions", () => {
    const entries = ["live", "ended", "scheduled", "offline"].map(status => ({ host_id: status, status, started_at: null }));
    expect(currentLiveHosts(entries).map(entry => entry.host_id)).toEqual(["live"]);
  });
  it("shows a host once using their newest currently live session", () => {
    const old = { host_id: "host", status: "live", started_at: "2026-11-21T00:00:00Z", id: "older" };
    const latest = { ...old, started_at: "2026-11-21T01:00:00Z", id: "latest" };
    expect(currentLiveHosts([old, latest, { ...latest, status: "ended", id: "ended" }])).toEqual([latest]);
  });
});