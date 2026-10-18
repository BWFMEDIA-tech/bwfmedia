export type ArtistStatus = "live" | "active" | "offline";
export function resolveArtistStatus(live: boolean, presence?: { online: boolean; last_seen_at: string }, now = Date.now()): ArtistStatus {
  if (live) return "live";
  const seen = presence ? Date.parse(presence.last_seen_at) : NaN;
  return presence?.online && Number.isFinite(seen) && now - seen < 120_000 && seen <= now + 5000 ? "active" : "offline";
}