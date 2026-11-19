/** Pure ranking helpers for the Tunevio Billboard charts. */
export type RankableTrack = {
  id: string;
  title: string;
  artistName: string;
  artistUserId: string | null;
  coverUrl: string | null;
  playCount: number;
};

function hasArtwork(t: RankableTrack) {
  return typeof t.coverUrl === "string" && t.coverUrl.trim().length > 0;
}

function songKey(t: RankableTrack) {
  const artist = (t.artistUserId ?? t.artistName ?? "").trim().toLowerCase();
  return `${artist}::${(t.title ?? "").trim().toLowerCase()}`;
}

/**
 * Keeps one entry per song (track id, then artist + title), drops songs
 * without artwork and orders by a single metric, highest first. Ties keep
 * the incoming order. Only the provided metric affects position.
 */
export function rankUnique<T extends RankableTrack>(
  tracks: T[],
  metric: (t: T) => number,
  limit = 100,
): T[] {
  const best = new Map<string, T>();
  const seenIds = new Set<string>();
  for (const t of tracks) {
    if (!hasArtwork(t) || seenIds.has(t.id)) continue;
    seenIds.add(t.id);
    const key = songKey(t);
    const prev = best.get(key);
    if (!prev || metric(t) > metric(prev)) best.set(key, t);
  }
  return [...best.values()]
    .map((t, i) => ({ t, i }))
    .sort((a, b) => metric(b.t) - metric(a.t) || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.t);
}

/** Billboard Top 100: verified cumulative plays only. */
export function rankTop100<T extends RankableTrack>(tracks: T[], limit = 100): T[] {
  return rankUnique(tracks, (t) => t.playCount, limit);
}
