/** Keep existing seats stable when heartbeat updates change database row order. */
export function stableParticipantOrder<T extends { id: string; user_id: string; joined_at: string }>(previous: T[], incoming: T[]): T[] {
  const positions = new Map(previous.map((row, index) => [row.user_id, index]));
  return [...incoming].sort((a, b) => {
    const aPosition = positions.get(a.user_id);
    const bPosition = positions.get(b.user_id);
    if (aPosition !== undefined || bPosition !== undefined) {
      return (aPosition ?? Number.MAX_SAFE_INTEGER) - (bPosition ?? Number.MAX_SAFE_INTEGER);
    }
    return a.joined_at.localeCompare(b.joined_at) || a.user_id.localeCompare(b.user_id) || a.id.localeCompare(b.id);
  });
}