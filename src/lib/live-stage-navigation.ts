export type StageEntry = { id: string; room_name: string; host_id: string; status: string; kind?: string };

export type StageDestination =
  | { to: "/stage/$roomId"; params: { roomId: string } }
  | { to: "/stream/$room"; params: { room: string } };

/** The joining route for one live room. Choosing a route never grants stage permissions. */
export function stageDestination(entry: StageEntry): StageDestination {
  return entry.kind === "stage"
    ? { to: "/stage/$roomId", params: { roomId: entry.id } }
    : { to: "/stream/$room", params: { room: entry.room_name } };
}

export type StageNavigation = { to: "/live"; live: false } | (StageDestination & { live: true });

/** Ownership chooses a destination, never grants stage permissions. */
export function liveStageDestination(entries: StageEntry[], userId?: string, connected = true): StageNavigation {
  const live = connected ? entries.filter((entry) => entry.status === "live") : [];
  const selected = live.find((entry) => entry.host_id === userId) ?? live[0];
  if (!selected) return { to: "/live", live: false };
  return { ...stageDestination(selected), live: true };
}
