/** Profile storage is not a destination for Arena submissions. */
export function arenaSubmissionChoices<T extends { title: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => row.title?.trim() !== "__profile_library__");
}