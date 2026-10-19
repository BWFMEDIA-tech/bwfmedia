import { describe, expect, it } from "vitest";
import { announcementContentSchema, groupAnnouncements, type SentAnnouncement } from "./announcement-edit";

const row: SentAnnouncement = { id: "one", actor_id: "admin", created_at: "2026-10-19T01:00:00Z", type: "announcement_update", title: "Update", body: null, link: null, media_url: null, media_type: null };
describe("announcement editing", () => {
  it("groups recipient copies, but keeps different sends separate", () => {
    expect(groupAnnouncements([row, { ...row, id: "two" }, { ...row, id: "three", created_at: "2026-10-19T02:00:00Z" }]).map((item) => item.id)).toEqual(["one", "three"]);
  });
  it("never combines announcements from different administrators", () => {
    expect(groupAnnouncements([row, { ...row, id: "two", actor_id: "other" }])).toHaveLength(2);
  });
  it("rejects external and protocol-relative links", () => {
    for (const link of ["https://example.com", "//example.com"]) expect(announcementContentSchema.safeParse({ kind: "event", title: "Event", link }).success).toBe(false);
    expect(announcementContentSchema.parse({ kind: "event", title: "Event", link: "/live" }).link).toBe("/live");
  });
});