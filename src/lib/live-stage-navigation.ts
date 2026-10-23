export type StageEntry = { id: string; room_name: string; host_id: string; status: string; kind?: string };

/** Ownership chooses a destination, never grants stage permissions. */
export function liveStageDestination(entries: StageEntry[], userId?: string, connected = true) {
  const live = connected ? entries.filter((entry) => entry.status === "live") : [];
  const selected = live.find((entry) => entry.host_id === userId) ?? live[0];
  if (!selected) return { to: "/live" as const, live: false };
  return selected.kind === "stage"
    ? { to: "/stage/$roomId" as const, params: { roomId: selected.id }, live: true }
    : { to: "/stream/$room" as const, params: { room: selected.room_name }, live: true };
}