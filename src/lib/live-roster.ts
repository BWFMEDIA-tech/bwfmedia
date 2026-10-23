import { stageDestination, type StageDestination, type StageEntry } from "./live-stage-navigation";

export type LiveHost = { display_name: string | null; avatar_url: string | null; stage_name: string | null } | null;

export type LiveRosterEntry = StageEntry & {
  title?: string | null;
  category?: string | null;
  viewer_count?: number | null;
  started_at?: string | null;
  host?: LiveHost;
};

export type LiveRosterRow = LiveRosterEntry & { destination: StageDestination };

/**
 * Everyone actually live on Tunevio: the signed-in person's own broadcast first,
 * then the rest newest-first. Offline, scheduled, idle and ended rooms are never listed.
 */
export function liveRosterRows(entries: LiveRosterEntry[], userId?: string): LiveRosterRow[] {
  const isOwn = (row: LiveRosterRow) => (userId && row.host_id === userId ? 0 : 1);
  return entries
    .filter((entry) => entry.status === "live")
    .map((entry) => ({ ...entry, destination: stageDestination(entry) }))
    .sort((a, b) => {
      if (isOwn(a) !== isOwn(b)) return isOwn(a) - isOwn(b);
      return String(b.started_at ?? "").localeCompare(String(a.started_at ?? ""));
    });
}

/** "3 people live" / "1 person live" — counted by host so a person with two rooms is counted once. */
export function liveRosterCountLabel(rows: LiveRosterRow[]): string {
  const hosts = new Set(rows.map((row) => row.host_id)).size;
  return `${hosts} ${hosts === 1 ? "person" : "people"} live`;
}

export function liveRosterHostName(row: LiveRosterEntry): string {
  return row.host?.stage_name || row.host?.display_name || "Tunevio host";
}
