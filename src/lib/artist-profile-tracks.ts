// An artist's songs can live in their hidden profile-library stream and in
// arena streams (submissions mirror rows into the arena's stream). The
// profile must show the artist's own songs either way, but never list the
// same song twice when it exists in both places.
export type ArtistTrackLike = {
  title: string;
  stream_id: string | null;
  created_at: string;
};

export function dedupeArtistTracks<T extends ArtistTrackLike>(
  rows: T[],
  profileStreamId: string | null,
): T[] {
  const byTitle = new Map<string, T>();
  for (const row of rows) {
    const key = row.title.trim().toLowerCase();
    if (!key) continue;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, row);
      continue;
    }
    const existingInLibrary = profileStreamId != null && existing.stream_id === profileStreamId;
    const rowInLibrary = profileStreamId != null && row.stream_id === profileStreamId;
    // Prefer the profile-library copy; otherwise keep the newest upload.
    if (rowInLibrary !== existingInLibrary) {
      if (rowInLibrary) byTitle.set(key, row);
    } else if (new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      byTitle.set(key, row);
    }
  }
  return [...byTitle.values()];
}
