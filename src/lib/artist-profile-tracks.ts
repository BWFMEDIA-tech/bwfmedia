// An artist's songs can live in their hidden profile-library stream and in
// arena streams (submissions mirror rows into the arena's stream). The
// profile must show the artist's own songs either way, but never list the
// same song twice when it exists in both places.
export type ArtistTrackLike = {
  title: string;
  stream_id: string | null;
  created_at: string;
  id?: string;
  artist_user_id?: string | null;
  audio_url?: string | null;
  source_track_id?: string | null;
};

// Signing tokens and URL transport variants do not change the recording.
export function songAudioIdentity(audio: string): string {
  const clean = audio.split("?")[0] ?? audio;
  const storage = clean.match(/(?:\/storage\/v1\/object\/(?:sign|public|authenticated)\/)?(artist-audio\/.*)$/);
  return storage?.[1] ?? clean;
}

export function dedupeArtistTracks<T extends ArtistTrackLike>(
  rows: T[],
  profileStreamId: string | null,
): T[] {
  const byTitle = new Map<string, T>();
  for (const row of rows) {
    const recording = row.audio_url ? songAudioIdentity(row.audio_url) : row.title.trim().toLowerCase();
    if (!recording) continue;
    const key = `${row.artist_user_id ?? ""}:${recording}`;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, row);
      continue;
    }
    const existingInLibrary = (profileStreamId != null && existing.stream_id === profileStreamId) || (existing.id != null && existing.id === row.source_track_id);
    const rowInLibrary = (profileStreamId != null && row.stream_id === profileStreamId) || (row.id != null && row.id === existing.source_track_id);
    // Prefer the profile-library copy; otherwise keep the newest upload.
    if (rowInLibrary !== existingInLibrary) {
      if (rowInLibrary) byTitle.set(key, row);
    } else if (new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      byTitle.set(key, row);
    }
  }
  return [...byTitle.values()];
}
