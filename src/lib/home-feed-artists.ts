// Home/Library feed rule: only songs uploaded by accounts holding the artist
// role may appear. Uploads from listeners, members, hosts or admins are hidden.
export function onlyArtistTracks<T extends { artist_user_id?: string | null }>(
  rows: readonly T[] | null | undefined,
  artistIds: ReadonlySet<string>,
): T[] {
  return (rows ?? []).filter(
    (r) => !!r.artist_user_id && artistIds.has(r.artist_user_id as string),
  );
}

// Home rule: songs without artwork never appear on the home page.
export function onlyWithArtwork<T extends { cover_url?: string | null }>(rows: readonly T[]): T[] {
  return rows.filter((r) => typeof r.cover_url === "string" && r.cover_url.trim() !== "");
}

// New Releases rule: one entry per release. Tracks have no album field, so
// songs by the same artist sharing the same artwork count as one album and
// only the first (newest) is shown; singles show once.
export function onePerRelease<T extends { artist_user_id?: string | null; cover_url?: string | null }>(
  rows: readonly T[],
): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.artist_user_id ?? ""}|${(r.cover_url ?? "").trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
