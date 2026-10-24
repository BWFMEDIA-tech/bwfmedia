import { describe, expect, it } from "vitest";
import { directoryCandidates, directoryRows, stageRoomAccess, type DirectoryRow } from "./live-directory";
import { filterOnAirStreams, type OnAirRoomClient } from "./live-on-air";

const stream = (id: string, mode = "broadcast"): DirectoryRow => ({ id, room_name: id, host_id: id, status: "live", kind: "stream", title: id, description: null, thumbnail_url: null, category: null, viewer_count: 0, started_at: null, mode });
const stage = { id: "stage", livekit_room: "stage-room", title: "My stage", host_id: "stage-host", status: "live", audience_count: 0, started_at: null, description: null };
const broadcast = { id: "broadcast", host_id: "stage-host", stream_title: "Show", stream_status: "live", description: null, viewer_count: 0, started_at: null, playback_source: { kind: "stage", stage_room_ids: [] } };
const service = (connected: Record<string, string>): OnAirRoomClient => ({
  listRooms: async () => Object.keys(connected).map(name => ({ name, numParticipants: 1 })),
  listParticipants: async room => [{ identity: connected[room], permission: { canPublish: true } }],
});
describe("unified live directory", () => {
  it("counts two connected visitors, including a guest, but excludes the host and stale stored counts", async () => {
    const liveService: OnAirRoomClient = {
      listRooms: async () => [{ name: "artist", numParticipants: 3 }],
      listParticipants: async () => [
        { identity: "artist", permission: { canPublish: true } },
        { identity: "fan", permission: { canPublish: false } },
        { identity: "guest_123", permission: { canPublish: false } },
        { identity: "preview_fan_123", permission: { canPublish: false } },
      ],
    };
    const rows = directoryRows(await filterOnAirStreams(directoryCandidates([{ ...stream("artist"), viewer_count: 99 }], [], [], []), liveService));
    expect(rows[0]?.viewer_count).toBe(2);
    expect(rows[0]).not.toHaveProperty("visitorIds");
  });
  it("updates to zero when the last visitor leaves a host-only room", async () => {
    const rows = directoryRows(await filterOnAirStreams(directoryCandidates([{ ...stream("artist"), viewer_count: 99 }], [], [], []), service({ artist: "artist" })));
    expect(rows[0]?.viewer_count).toBe(0);
  });
  it("counts each visitor once across a broadcast's linked rooms", () => {
    const row = { ...stream("show"), kind: "broadcast" as const };
    expect(directoryRows([
      { row, room: "a", hostId: "show", visitorIds: ["fan-1", "fan-2"] },
      { row, room: "b", hostId: "show", visitorIds: ["fan-2", "fan-3"] },
    ])[0]?.viewer_count).toBe(3);
  });
  for (const [id, mode] of [["artist", "broadcast"], ["host", "broadcast"], ["audio", "stage"], ["arena", "broadcast"]]) {
    it(`automatically includes connected ${id} streams without role filtering`, async () => {
      const result = await filterOnAirStreams(directoryCandidates([stream(id, mode)], [], [], []), service({ [id]: id }));
      expect(directoryRows(result).map(r => r.id)).toEqual([id]);
    });
  }
  it("includes standalone Stage Rooms with their own joining destination", async () => {
    const result = await filterOnAirStreams(directoryCandidates([], [stage], [], []), service({ "stage-room": "stage-host" }));
    expect(directoryRows(result).map(r => [r.kind, r.room_name])).toEqual([["stage", "stage"]]);
  });
  it("includes stage-linked broadcasts from saved links, not just the playback JSON", async () => {
    const result = await filterOnAirStreams(directoryCandidates([], [stage], [broadcast], [{ broadcast_id: "broadcast", stage_room_id: "stage" }]), service({ "stage-room": "stage-host" }));
    expect(directoryRows(result).map(r => r.kind)).toEqual(["broadcast", "stage"]);
  });
  it("does not fabricate a live broadcast from a schedule or upload", () => {
    expect(directoryCandidates([], [], [{ ...broadcast, playback_source: { kind: "upload", asset_url: "https://example.com/video" } }], [])).toEqual([]);
  });
  it("removes every linked listing on host disconnect", async () => {
    const result = await filterOnAirStreams(directoryCandidates([], [stage], [broadcast], [{ broadcast_id: "broadcast", stage_room_id: "stage" }]), service({}));
    expect(directoryRows(result)).toEqual([]);
  });
  it("ended Stage Rooms and broadcasts do not remain discoverable", () => {
    expect(directoryCandidates([], [{ ...stage, status: "ended" }], [{ ...broadcast, stream_status: "ended" }], [])).toEqual([]);
  });
  it("does not lose older active broadcasters behind 50 stale records", async () => {
    const candidates = directoryCandidates([...Array.from({ length: 60 }, (_, i) => stream(`ghost-${i}`)), stream("connected")], [], [], []);
    expect(directoryRows(await filterOnAirStreams(candidates, service({ connected: "connected" })), 50).map(r => r.id)).toEqual(["connected"]);
  });
  it("unlimited directory preserves more than 50 connected artists and hosts", () => {
    const candidates = directoryCandidates(Array.from({ length: 101 }, (_, i) => stream(`host-${i}`)), [], [], []);
    expect(directoryRows(candidates)).toHaveLength(101);
  });
  it("only the standalone stage owner can publish; all other signed-in roles listen", () => {
    expect(stageRoomAccess(stage, "stage-host")).toEqual({ canJoin: true, canPublish: true, isHost: true });
    for (const user of ["artist", "host", "fan", "listener", "admin"]) expect(stageRoomAccess(stage, user)).toEqual({ canJoin: true, canPublish: false, isHost: false });
    expect(stageRoomAccess({ ...stage, status: "ended" }, "listener").canJoin).toBe(false);
  });
});