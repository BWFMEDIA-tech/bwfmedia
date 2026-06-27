import { useSyncExternalStore } from "react";

// Tiny global store for "is the shared audio element currently playing?".
// Lets non-player UI (e.g. BattleArena vinyl spin) freeze/resume in sync
// with the actual <audio> element owned by ImmersivePlayer.

let playing = false;
const listeners = new Set<() => void>();

export function setPlaybackPlaying(next: boolean) {
  if (playing === next) return;
  playing = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return playing;
}

export function usePlaybackPlaying() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}