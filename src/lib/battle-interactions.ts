/** Scores can choose a leader, never a battle side. Preserve the assigned order. */
export function assignedArtistIds(artists: readonly { id: string }[]): string[] {
  return artists.map((artist) => artist.id);
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