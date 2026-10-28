/** Pure genre matching for the video network, shared by the /videos filter. */
export type GenreVideo = { title: string; artist?: string | null; description?: string | null; genre?: string | null };

export function videoMatchesGenre(video: GenreVideo, selected: string): boolean {
  if (selected === "All genres") return true;
  const stored = (video.genre ?? "").toLowerCase();
  if (stored) return stored === selected.toLowerCase();
  const text = `${video.title} ${video.artist ?? ""} ${video.description ?? ""}`.toLowerCase();
  return selected === "Hip Hop"
    ? /hip[ -]?hop|rap/.test(text)
    : selected === "R&B"
      ? /r&b|rnb|rhythm and blues/.test(text)
      : text.includes(selected.toLowerCase());
}
