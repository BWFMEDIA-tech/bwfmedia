import { describe, expect, it } from "vitest";
import { filterOnAirStreams, type OnAirCandidate, type OnAirRoomClient } from "./live-on-air";

type Row = { id: string };

const candidate = (id: string, room: string | null, hostId = "host-1"): OnAirCandidate<Row> => ({
  row: { id },
  room,
  hostId,
});

const client = (
  rooms: Array<{ name: string; numParticipants?: number }>,
  participants: Record<string, Array<{ identity?: string; permission?: { canPublish?: boolean } }>>,
): OnAirRoomClient => ({
  listRooms: async () => rooms,
  listParticipants: async (room) => {
    if (!(room in participants)) throw new Error("room does not exist");
    return participants[room];
  },
});

const ids = (rows: OnAirCandidate<Row>[]) => rows.map((r) => r.row.id);

describe("filterOnAirStreams", () => {
  it("drops a row whose room no longer exists — the stuck-live case", async () => {
    const rows = await filterOnAirStreams(
      [candidate("ghost", "bwf-live-live-arena-79b5a239")],
      client([], {}),
    );
    expect(ids(rows)).toEqual([]);
  });

  it("drops a room that exists but has nobody connected", async () => {
    const rows = await filterOnAirStreams(
      [candidate("empty", "room-empty")],
      client([{ name: "room-empty", numParticipants: 0 }], { "room-empty": [] }),
    );
    expect(ids(rows)).toEqual([]);
  });

  it("keeps a row whose host is connected with broadcast rights", async () => {
    const rows = await filterOnAirStreams(
      [candidate("real", "room-live")],
      client(
        [{ name: "room-live", numParticipants: 3 }],
        { "room-live": [{ identity: "host-1", permission: { canPublish: true } }] },
      ),
    );
    expect(ids(rows)).toEqual(["real"]);
  });

  it("drops a host who is only connected as a listener", async () => {
    const rows = await filterOnAirStreams(
      [candidate("idle", "room-listening")],
      client(
        [{ name: "room-listening", numParticipants: 1 }],
        { "room-listening": [{ identity: "host-1", permission: { canPublish: false } }] },
      ),
    );
    expect(ids(rows)).toEqual([]);
  });

  it("drops a room where only guests are left behind", async () => {
    const rows = await filterOnAirStreams(
      [candidate("guests", "room-guests")],
      client(
        [{ name: "room-guests", numParticipants: 4 }],
        {
          "room-guests": [
            { identity: "guest_abc", permission: { canPublish: false } },
            { identity: "someone-else", permission: { canPublish: false } },
          ],
        },
      ),
    );
    expect(ids(rows)).toEqual([]);
  });

  it("keeps real broadcasts and drops ghosts in the same listing", async () => {
    const rows = await filterOnAirStreams(
      [candidate("ghost", "room-gone"), candidate("real", "room-live")],
      client(
        [{ name: "room-live", numParticipants: 2 }],
        { "room-live": [{ identity: "host-1", permission: { canPublish: true } }] },
      ),
    );
    expect(ids(rows)).toEqual(["real"]);
  });

  it("keeps every row when the live service cannot be reached", async () => {
    const unreachable: OnAirRoomClient = {
      listRooms: async () => {
        throw new Error("network down");
      },
      listParticipants: async () => [],
    };
    const rows = await filterOnAirStreams([candidate("a", "room-a")], unreachable);
    expect(ids(rows)).toEqual(["a"]);
  });

  it("keeps every row when the live service is not configured", async () => {
    const rows = await filterOnAirStreams([candidate("a", "room-a")], null);
    expect(ids(rows)).toEqual(["a"]);
  });

  it("drops only the row whose participant lookup fails", async () => {
    const rows = await filterOnAirStreams(
      [candidate("broken", "room-broken"), candidate("real", "room-live")],
      client(
        [
          { name: "room-broken", numParticipants: 1 },
          { name: "room-live", numParticipants: 1 },
        ],
        { "room-live": [{ identity: "host-1", permission: { canPublish: true } }] },
      ),
    );
    expect(ids(rows)).toEqual(["real"]);
  });

  it("drops a row that has no room to check", async () => {
    const rows = await filterOnAirStreams(
      [candidate("noroom", null)],
      client([{ name: "room-live", numParticipants: 1 }], {}),
    );
    expect(ids(rows)).toEqual([]);
  });
});
