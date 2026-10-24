/**
 * Deciding whether a broadcast is actually on air.
 *
 * A `streams` or `stage_rooms` row can stay at status "live" after the host
 * closes the app — the row is left behind while nobody is broadcasting any more.
 * Navigation, the live list and the Arena button must not light up for that
 * ghost row, so the live service itself is asked whether the host is connected.
 */

/** Read-only view of the live service's rooms and their participants. */
export type OnAirRoomClient = {
  listRooms(names: string[]): Promise<Array<{ name: string; numParticipants?: number }>>;
  listParticipants(room: string): Promise<Array<{ identity?: string; permission?: { canPublish?: boolean } }>>;
};

export type OnAirCandidate<T> = { row: T; room: string | null; hostId: string };

/**
 * Keeps only the rows whose host is really connected to the room with broadcast
 * rights. A room that no longer exists, an empty room, and a host who is present
 * only as a listener are all treated as off air. When the live service cannot be
 * reached the caller receives an availability error, never fabricated live rows.
 */
export async function filterOnAirStreams<T>(
  candidates: OnAirCandidate<T>[],
  client: OnAirRoomClient | null,
): Promise<OnAirCandidate<T>[]> {
  if (candidates.length === 0) return candidates;
  if (!client) throw new Error("Live presence temporarily unavailable");
  const names = [...new Set(candidates.map((c) => c.room).filter((n): n is string => !!n))];

  let rooms: Array<{ name: string; numParticipants?: number }> = [];
  if (names.length > 0) {
    try {
      rooms = await client.listRooms(names);
    } catch {
      throw new Error("Live presence temporarily unavailable");
    }
  }
  const peopleByRoom = new Map(rooms.map((r) => [r.name, r.numParticipants ?? 0]));

  // One lookup per physical room, even when a broadcast links to a listed stage.
  const partsByRoom = new Map<string, Awaited<ReturnType<OnAirRoomClient["listParticipants"]>>>();
  for (let offset = 0; offset < names.length; offset += 10) {
    await Promise.all(names.slice(offset, offset + 10).map(async name => {
      if ((peopleByRoom.get(name) ?? 0) <= 0) return;
      try { partsByRoom.set(name, await client.listParticipants(name)); }
      catch { /* A room can disappear between the two presence reads. */ }
    }));
  }
  const onAir = candidates.map(candidate => candidate.room && partsByRoom.get(candidate.room)?.some(
    p => p.identity === candidate.hostId && p.permission?.canPublish === true,
  ));

  return candidates.filter((_, index) => onAir[index]);
}
