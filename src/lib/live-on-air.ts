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
 * reached the candidates are returned untouched — an outage must never hide a
 * real broadcast.
 */
export async function filterOnAirStreams<T>(
  candidates: OnAirCandidate<T>[],
  client: OnAirRoomClient | null,
): Promise<OnAirCandidate<T>[]> {
  if (!client || candidates.length === 0) return candidates;
  const names = [...new Set(candidates.map((c) => c.room).filter((n): n is string => !!n))];

  let rooms: Array<{ name: string; numParticipants?: number }> = [];
  if (names.length > 0) {
    try {
      rooms = await client.listRooms(names);
    } catch {
      return candidates;
    }
  }
  const peopleByRoom = new Map(rooms.map((r) => [r.name, r.numParticipants ?? 0]));

  const onAir = await Promise.all(
    candidates.map(async (candidate) => {
      if (!candidate.room) return false;
      if ((peopleByRoom.get(candidate.room) ?? 0) <= 0) return false;
      try {
        const parts = await client.listParticipants(candidate.room);
        return parts.some(
          (p) => p.identity === candidate.hostId && p.permission?.canPublish === true,
        );
      } catch {
        return false;
      }
    }),
  );

  return candidates.filter((_, index) => onAir[index]);
}
