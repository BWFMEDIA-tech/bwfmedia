import { describe, expect, it } from "vitest";
import { liveRosterRows, liveRosterCountLabel, type LiveRosterEntry } from "./live-roster";

const own: LiveRosterEntry = {
  id: "stream-own", room_name: "own-room", host_id: "host", status: "live", kind: "stream",
  title: "My set", started_at: "2026-10-23T01:00:00.000Z", viewer_count: 4,
  host: { display_name: "Me", avatar_url: null, stage_name: null },
};
const other: LiveRosterEntry = {
  id: "stream-other", room_name: "other-room", host_id: "other", status: "live", kind: "stream",
  title: "Their set", started_at: "2026-10-23T03:00:00.000Z", viewer_count: 9,
};
const stage: LiveRosterEntry = {
  id: "stage-1", room_name: "stage-1", host_id: "third", status: "live", kind: "stage",
  title: "Stage room", started_at: "2026-10-23T02:00:00.000Z", viewer_count: 2,
};

describe("live roster", () => {
  it("lists only rooms that are actually live", () => {
    const entries = [own, other, stage].flatMap((entry) =>
      ["offline", "scheduled", "idle", "ended", "disconnected"].map((status) => ({ ...entry, status })),
    );
    expect(liveRosterRows(entries, "host")).toEqual([]);
    expect(liveRosterRows([own], "host")).toHaveLength(1);
  });
  it("puts the signed-in person's own broadcast first without hiding anyone else", () => {
    const rows = liveRosterRows([other, own], "host");
    expect(rows.map((row) => row.host_id)).toEqual(["host", "other"]);
    expect(liveRosterRows([other, own]).map((row) => row.host_id)).toEqual(["other", "host"]);
  });
  it("orders everyone else by most recently started", () => {
    const older: LiveRosterEntry = { ...other, id: "older", room_name: "older", started_at: "2026-10-22T03:00:00.000Z" };
    expect(liveRosterRows([older, other], "nobody").map((row) => row.id)).toEqual(["stream-other", "older"]);
  });
  it("sends streams to the room name and stages to the stage room identifier", () => {
    const rows = liveRosterRows([own, stage], "host");
    expect(rows[0].destination).toEqual({ to: "/stream/$room", params: { room: "own-room" } });
    expect(rows[1].destination).toEqual({ to: "/stage/$roomId", params: { roomId: "stage-1" } });
  });
  it("counts people live once per host", () => {
    const secondRoom: LiveRosterEntry = { ...own, id: "stream-own-2", room_name: "own-room-2" };
    expect(liveRosterCountLabel(liveRosterRows([own, secondRoom, other], "host"))).toBe("2 people live");
    expect(liveRosterCountLabel(liveRosterRows([other], "host"))).toBe("1 person live");
    expect(liveRosterCountLabel(liveRosterRows([], "host"))).toBe("0 people live");
  });
});
