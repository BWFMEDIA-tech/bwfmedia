/** Invitations and finished matchups are not confirmed queue entries. */
export function confirmedFreestyleMatchups<T extends { status: string; slot_number: number | null }>(rows: T[]): T[] {
  return rows.filter(row => ['accepted', 'scheduled', 'live'].includes(row.status) && row.slot_number !== null)
    .sort((a, b) => (a.status === 'live' ? 0 : a.status === 'scheduled' ? 1 : 2) - (b.status === 'live' ? 0 : b.status === 'scheduled' ? 1 : 2) || (a.slot_number ?? 0) - (b.slot_number ?? 0));
}