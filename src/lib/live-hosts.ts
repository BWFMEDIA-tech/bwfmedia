import type { DirectoryRow } from "./live-directory";

/** One current session per broadcaster; the shared directory verifies on-air presence. */
export function currentLiveHosts<T extends Pick<DirectoryRow, "status" | "host_id" | "started_at">>(entries: T[]): T[] {
  const hosts = new Map<string, T>();
  for (const entry of entries) {
    if (entry.status !== "live") continue;
    const previous = hosts.get(entry.host_id);
    if (!previous || String(entry.started_at ?? "") > String(previous.started_at ?? "")) {
      hosts.set(entry.host_id, entry);
    }
  }
  return [...hosts.values()];
}