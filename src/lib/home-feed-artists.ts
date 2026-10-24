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
