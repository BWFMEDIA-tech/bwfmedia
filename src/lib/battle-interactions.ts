/** Scores can choose a leader, never a battle side. Preserve the assigned order. */
export function assignedArtistIds(artists: readonly { id: string }[]): string[] {
  return artists.map((artist) => artist.id);
}

/** Host-selected match/side IDs take priority over newer unrelated submissions. */
export function assignedBattleTrack<T extends {
  id: string; artist_user_id: string | null; battle_match_id?: string | null;
  battle_side?: string | null;
}>(tracks: readonly T[], matchId: string, side: "a" | "b", artistId: string): T | null {
  return tracks.find(t => t.artist_user_id === artistId && t.battle_match_id === matchId && t.battle_side === side)
    ?? tracks.find(t => t.artist_user_id === artistId) ?? null;
}

/** Synchronous, component-owned guard: React state alone cannot block rapid clicks. */
export function createInteractionGate() {
  let busy = false;
  return {
    enter() {
      if (busy) return false;
      busy = true;
      return true;
    },
    leave() { busy = false; },
  };
}

/** Only the newest requested snapshot may be applied, including after reconnect. */
export function createSnapshotGate() {
  let revision = 0;
  return {
    begin() { return ++revision; },
    isCurrent(request: number) { return request === revision; },
    invalidate() { revision++; },
  };
}