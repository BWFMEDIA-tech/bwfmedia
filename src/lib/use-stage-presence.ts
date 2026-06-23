import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { updateMyStagePresence } from "@/lib/stage.functions";

/**
 * Keeps the current user's `stage_participants` row alive while the page is
 * open. Sends a heartbeat every 30 seconds, marks the user as `reconnecting`
 * when the page is hidden, and `disconnected` on unload. The pg_cron cleanup
 * job removes rows whose `last_seen_at` is older than 2 minutes.
 */
export function useStagePresence(streamId: string | null, userId: string | null) {
  const updatePresence = useServerFn(updateMyStagePresence);

  useEffect(() => {
    if (!streamId || !userId) return;
    let cancelled = false;

    const update = (connectionStatus: "connected" | "reconnecting" | "disconnected") =>
      updatePresence({ data: { streamId, connectionStatus } }).catch(() => {});

    const beat = () => {
      if (cancelled) return;
      void update("connected");
    };

    // Immediate heartbeat on mount, then every 30s.
    beat();
    const id = window.setInterval(beat, 30_000);

    const onVisibility = () => {
      if (document.hidden) {
        void update("reconnecting");
      } else {
        beat();
      }
    };
    const onUnload = () => {
      // Best-effort. The row will be cleaned by the cron job after 2 min.
      void update("disconnected");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [streamId, userId, updatePresence]);
}