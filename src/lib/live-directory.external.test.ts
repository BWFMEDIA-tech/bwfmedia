import { describe, expect, it } from "vitest";
import { externalBroadcastRows } from "./live-directory";
const now = Date.parse("2026-11-05T17:00:00Z");
const base = { id: "b1", host_id: "h", stream_title: "Live", stream_status: "live", description: null, viewer_count: 0, playback_source: { kind: "external", url: "https://youtube.com/x" } };
describe("link broadcasts in live directory", () => {
  it("lists a live link broadcast started recently", () => {
    expect(externalBroadcastRows([{ ...base, started_at: "2026-11-05T16:00:00Z" }], now)).toHaveLength(1);
  });
  it("hides one started more than 12 hours ago", () => {
    expect(externalBroadcastRows([{ ...base, started_at: "2026-11-05T04:00:00Z" }], now)).toHaveLength(0);
  });
  it("hides stopped broadcasts", () => {
    expect(externalBroadcastRows([{ ...base, stream_status: "ended", started_at: "2026-11-05T16:00:00Z" }], now)).toHaveLength(0);
  });
});
