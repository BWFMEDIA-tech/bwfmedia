import { describe, expect, it } from "vitest";
import type { DirectoryRow } from "./live-directory";
import { profileLiveSession } from "./profile-live";
import { stageDestination } from "./live-stage-navigation";

const row = (kind: DirectoryRow["kind"], host_id = "member"): DirectoryRow => ({
  id: `${kind}-id`, kind, host_id, title: "Live session", room_name: "member-room", status: "live",
  category: null, description: null, thumbnail_url: null, viewer_count: 0, started_at: null, mode: null,
});

describe("member profile live sessions", () => {
  it.each(["stream", "stage", "broadcast"] as const)("shows and joins a member's %s without a role requirement", kind => {
    const selected = profileLiveSession([row(kind)], "member");
    expect(selected?.id).toBe(`${kind}-id`);
    if (!selected) throw new Error("Missing member live session");
    const expected = kind === "stream" ? { to: "/stream/$room", params: { room: "member-room" } }
      : kind === "stage" ? { to: "/stage/$roomId", params: { roomId: "stage-id" } }
        : { to: "/broadcast/$broadcastId", params: { broadcastId: "broadcast-id" } };
    expect(stageDestination(selected)).toEqual(expected);
  });
  it("never shows another member's session", () => {
    expect(profileLiveSession([row("stream", "someone-else")], "member")).toBeNull();
  });
  it("restores the offline profile when no confirmed session remains", () => {
    expect(profileLiveSession([], "member")).toBeNull();
    expect(profileLiveSession([{ ...row("stream"), status: "ended" }], "member")).toBeNull();
  });
  it("preserves the inline stream room when multiple broadcast types are active", () => {
    expect(profileLiveSession([row("stage"), row("stream")], "member")?.kind).toBe("stream");
  });
});