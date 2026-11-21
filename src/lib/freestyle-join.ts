export interface FreestyleJoinMatchup {
  id: string;
  status: string;
  stream_id: string | null;
  artist_a_id: string;
  artist_b_id: string;
  updated_at: string;
}

export function currentFreestyleMatchup<T extends FreestyleJoinMatchup>(rows: T[], streamId: string): T | undefined {
  return rows.filter(row => row.stream_id === streamId && ['accepted', 'scheduled', 'live'].includes(row.status))
    .sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
}

export function assignedFreestyleSide(userId: string, artistA?: string, artistB?: string) {
  if (userId === artistA) return 'A';
  if (userId === artistB) return 'B';
  return null;
}

/** Battle participation is independent of stage seats, but never overrides host mutes or server grants. */
export function silenceFreestyleMicrophone(stageSilenced: boolean, assigned: boolean, canPublish: boolean | undefined, hostMuted: boolean) {
  return assigned ? hostMuted || canPublish !== true : stageSilenced;
}