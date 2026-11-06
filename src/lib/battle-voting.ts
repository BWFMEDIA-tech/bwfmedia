/** A round can accept votes only after both assigned songs have finished. */
export function bothBattleSongsFinished(round: {
  a_track_finished_at?: string | null;
  b_track_finished_at?: string | null;
} | null | undefined): boolean {
  return !!round?.a_track_finished_at && !!round?.b_track_finished_at;
}