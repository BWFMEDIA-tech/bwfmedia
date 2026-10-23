import { useSyncExternalStore } from "react";

let snapshot: { streamId: string; connected: boolean } | null = null;
const listeners = new Set<() => void>();
export function setStageNavigationConnection(value: typeof snapshot) {
  snapshot = value;
  listeners.forEach((listener) => listener());
}
export function useStageNavigationConnection() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => snapshot,
    () => null,
  );
}