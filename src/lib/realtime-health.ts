import { useSyncExternalStore } from "react";

/**
 * Global realtime/transport health store.
 *
 * Centralizes connection status for every realtime surface (LiveKit stage,
 * voting queue, chat, Play Arena) so the UI can react consistently and
 * gracefully degrade instead of blocking the room when a single transport
 * fails.
 *
 * Status meaning:
 *  - "connected":      All transports healthy.
 *  - "reconnecting":   Transient drop, auto-recovery in progress.
 *  - "degraded":       At least one transport down, but the room remains
 *                      usable via fallbacks (chat over Supabase realtime,
 *                      queue browsing, "sync on reconnect" voting).
 *  - "quota_exceeded": LiveKit (or other vendor) returned 429 / capacity
 *                      limit. Reconnect storm stopped. Degraded mode on.
 *  - "auth_failed":    Credentials rejected. Requires sign-in / refresh.
 */
export type RealtimeStatus =
  | "connected"
  | "reconnecting"
  | "degraded"
  | "quota_exceeded"
  | "auth_failed";

export type RealtimeSurface = "livekit" | "chat" | "queue" | "play";

export interface RealtimeHealth {
  status: RealtimeStatus;
  detail?: string;
  /** Which surface caused the current status (most recent setter). */
  source?: RealtimeSurface;
  /** Per-surface status for fine-grained UI decisions. */
  surfaces: Record<RealtimeSurface, RealtimeStatus>;
  updatedAt: number;
}

const initialSurfaces: Record<RealtimeSurface, RealtimeStatus> = {
  livekit: "connected",
  chat: "connected",
  queue: "connected",
  play: "connected",
};

let state: RealtimeHealth = {
  status: "connected",
  surfaces: { ...initialSurfaces },
  updatedAt: 0,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Aggregate per-surface statuses into an overall room status. */
function rollup(surfaces: Record<RealtimeSurface, RealtimeStatus>): RealtimeStatus {
  const values = Object.values(surfaces);
  if (values.includes("auth_failed")) return "auth_failed";
  if (values.includes("quota_exceeded")) return "quota_exceeded";
  if (values.includes("degraded")) return "degraded";
  if (values.includes("reconnecting")) return "reconnecting";
  return "connected";
}

/**
 * Update the health status for a specific transport surface. Other surfaces
 * keep their last reported status. Safe to call from non-React modules.
 */
export function setRealtimeHealth(
  source: RealtimeSurface,
  status: RealtimeStatus,
  detail?: string,
) {
  const nextSurfaces = { ...state.surfaces, [source]: status };
  const nextStatus = rollup(nextSurfaces);
  state = {
    status: nextStatus,
    detail: status === "connected" ? undefined : detail ?? state.detail,
    source,
    surfaces: nextSurfaces,
    updatedAt: Date.now(),
  };
  emit();
}

/** Reset every surface to "connected". Use when the user manually retries. */
export function resetRealtimeHealth() {
  state = {
    status: "connected",
    surfaces: { ...initialSurfaces },
    updatedAt: Date.now(),
  };
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot(): RealtimeHealth {
  return state;
}

/** React hook — subscribes to the global realtime health store. */
export function useRealtimeHealth(): RealtimeHealth {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True when LiveKit is down but other surfaces should keep working. */
export function isDegraded(h: RealtimeHealth): boolean {
  return (
    h.surfaces.livekit === "degraded" ||
    h.surfaces.livekit === "quota_exceeded" ||
    h.surfaces.livekit === "auth_failed"
  );
}