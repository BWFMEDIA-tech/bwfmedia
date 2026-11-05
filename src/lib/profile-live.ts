import type { DirectoryRow } from "./live-directory";

/** Select only this profile's confirmed sessions; prefer the existing inline stream room. */
export function profileLiveSession<T extends DirectoryRow>(entries: T[], accountId: string): T | null {
  const owned = entries.filter(entry => entry.host_id === accountId && entry.status === "live")
    .sort((a, b) => String(b.started_at ?? "").localeCompare(String(a.started_at ?? "")) || a.id.localeCompare(b.id));
  return owned.find(entry => entry.kind === "stream") ?? owned[0] ?? null;
}