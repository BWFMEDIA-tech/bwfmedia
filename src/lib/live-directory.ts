import type { OnAirCandidate } from "./live-on-air";

export type DirectoryRow = {
  id: string; title: string; room_name: string; host_id: string; status: string;
  kind: "stream" | "stage" | "broadcast"; category: string | null;
  description: string | null; thumbnail_url: string | null; viewer_count: number;
  started_at: string | null; mode: string | null;
  preview_room_name?: string;
};
type Stage = { id: string; title: string; host_id: string; status: string; livekit_room: string; audience_count: number; started_at: string | null; description: string | null };
type Broadcast = { id: string; host_id: string; stream_title: string; stream_status: string; description: string | null; viewer_count: number; started_at: string | null; playback_source: unknown };

/** A programmed broadcast is on air only through its genuinely connected live stages. */
export function directoryCandidates(streams: DirectoryRow[], stages: Stage[], broadcasts: Broadcast[], links: { broadcast_id: string; stage_room_id: string }[]): OnAirCandidate<DirectoryRow>[] {
  const candidates: OnAirCandidate<DirectoryRow>[] = streams.filter(s => s.status === "live").map(row => ({ row, room: row.room_name, hostId: row.host_id }));
  const stageMap = new Map(stages.filter(s => s.status === "live").map(s => [s.id, s]));
  for (const s of stageMap.values()) candidates.push({ room: s.livekit_room, hostId: s.host_id, row: {
    id: s.id, title: s.title, room_name: s.id, host_id: s.host_id, status: "live", kind: "stage", category: null,
    description: s.description, thumbnail_url: null, viewer_count: s.audience_count ?? 0, started_at: s.started_at, mode: "stage",
  } });
  for (const b of broadcasts.filter(b => b.stream_status === "live")) {
    const source = b.playback_source as { kind?: string; stage_room_ids?: string[] } | null;
    if (source?.kind !== "stage") continue; // A file/schedule alone is not a connected broadcaster.
    const ids = new Set([...links.filter(l => l.broadcast_id === b.id).map(l => l.stage_room_id), ...(source.stage_room_ids ?? [])]);
    for (const id of ids) {
      const stage = stageMap.get(id);
      if (!stage) continue;
      candidates.push({ room: stage.livekit_room, hostId: b.host_id, row: {
        id: b.id, title: b.stream_title, room_name: b.id, host_id: b.host_id, status: "live", kind: "broadcast", category: null,
        description: b.description, thumbnail_url: null, viewer_count: b.viewer_count ?? 0, started_at: b.started_at, mode: "broadcast",
      } });
    }
  }
  return candidates;
}

export function directoryRows(candidates: OnAirCandidate<DirectoryRow>[], limit?: number): DirectoryRow[] {
  const unique = new Map<string, DirectoryRow>();
  const visitors = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const key = `${candidate.row.kind}:${candidate.row.id}`;
    unique.set(key, { ...candidate.row, preview_room_name: candidate.room ?? undefined });
    if (candidate.visitorIds !== undefined) {
      const identities = visitors.get(key) ?? new Set<string>();
      for (const id of candidate.visitorIds) identities.add(id);
      visitors.set(key, identities);
    }
  }
  // Linked rooms count each visitor once; only totals leave the server reader.
  for (const [key, identities] of visitors) {
    const row = unique.get(key);
    if (row) unique.set(key, { ...row, viewer_count: identities.size });
  }
  const rows = [...unique.values()].sort((a, b) => String(b.started_at ?? "").localeCompare(String(a.started_at ?? "")) || a.id.localeCompare(b.id));
  return limit === undefined ? rows : rows.slice(0, limit);
}

export function stageRoomAccess(room: { host_id: string; status: string }, userId: string) {
  const isHost = room.host_id === userId;
  return { canJoin: isHost || room.status === "live", canPublish: isHost, isHost };
}