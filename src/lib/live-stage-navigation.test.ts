import { describe, expect, it } from "vitest";
import { liveStageDestination, type StageEntry } from "./live-stage-navigation";

const stream: StageEntry = { id: "stream-1", room_name: "host-room", host_id: "host", status: "live", kind: "stream" };
describe("live stage navigation", () => {
  it("routes hosts, members and listeners to the actual stream joining route", () => {
    for (const user of ["host", "member", "listener", undefined]) {
      expect(liveStageDestination([stream], user)).toEqual({ to: "/stream/$room", params: { room: "host-room" }, live: true });
    }
  });
  it("prefers the signed-in owner's stage without granting permissions", () => {
    expect(liveStageDestination([{ ...stream, room_name: "other", host_id: "other" }, stream], "host").params).toEqual({ room: "host-room" });
  });
  it("removes the live state for offline, scheduled, idle and ended streams", () => {
    for (const status of ["offline", "scheduled", "idle", "ended", "disconnected"]) {
      expect(liveStageDestination([{ ...stream, status }])).toEqual({ to: "/live", live: false });
    }
  });
  it("removes the live state after ending or losing network connectivity", () => {
    expect(liveStageDestination([])).toEqual({ to: "/live", live: false });
    expect(liveStageDestination([stream], "host", false)).toEqual({ to: "/live", live: false });
  });
  it("keeps standalone stage room identifiers separate from stream room names", () => {
    expect(liveStageDestination([{ ...stream, kind: "stage" }])).toEqual({ to: "/stage/$roomId", params: { roomId: "stream-1" }, live: true });
  });
});