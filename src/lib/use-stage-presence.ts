import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps the current user's `stage_participants` row alive while the page is
 * open. Sends a heartbeat every 30 seconds, marks the user as `reconnecting`
 * when the page is hidden, and `disconnected` on unload. The pg_cron cleanup
 * job removes rows whose `last_seen_at` is older than 2 minutes.
 */
export function useStagePresence(streamId: string | null, userId: string | null) {
  useEffect(() => {
    if (!streamId || !userId) return;
    let cancelled = false;

    const update = (patch: { last_seen_at?: string; connection_status?: string }) =>
      supabase
        .from("stage_participants")
        .update(patch)
        .eq("stream_id", streamId)
        .eq("user_id", userId);

    const beat = () => {
      if (cancelled) return;
      void update({ last_seen_at: new Date().toISOString(), connection_status: "connected" });
    };

    // Immediate heartbeat on mount, then every 30s.
    beat();
    const id = window.setInterval(beat, 30_000);

    const onVisibility = () => {
      if (document.hidden) {
        void update({ connection_status: "reconnecting" });
      } else {
        beat();
      }
    };
    const onUnload = () => {
      // Best-effort. The row will be cleaned by the cron job after 2 min.
      void update({ connection_status: "disconnected" });
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
  }, [streamId, userId]);
}