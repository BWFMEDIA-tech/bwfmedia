import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayArenaSnapshot } from "@/lib/play-arena.functions";

/**
 * Stage Join Gateway.
 *
 * On join, every user gets one consolidated Realtime channel per stream
 * — no more spinning up four or five overlapping subscriptions per page.
 * The hook decides what to subscribe to based on role:
 *
 *   viewer   — only `play_tracks` status flips (now-playing changes).
 *              No vote feed at all. Counts come from snapshot refetch.
 *   voter    — adds the per-stream vote feed, throttled to one update
 *              per ~250 ms via requestAnimationFrame coalescing.
 *   host     — same as voter; the host's studio surface keeps its own
 *              dedicated channels for queue management.
 *
 * The hook returns the current snapshot view and a `mode` (`"normal"`
 * or `"lite"`). Lite mode kicks in for viewers, when audience > 75, or
 * when the browser reports `saveData`. Lite mode pushes update bursts
 * to 1 s windows instead of 250 ms and tells visualizers to render
 * static art.
 */

export type StageRole = "viewer" | "voter" | "host";
export type StageMode = "normal" | "lite";

const LITE_AUDIENCE_THRESHOLD = 75;

export interface StageView {
  snapshot: PlayArenaSnapshot | null;
  mode: StageMode;
  role: StageRole;
}

export function useStageGateway({
  snapshot,
  role,
  onRefresh,
}: {
  snapshot: PlayArenaSnapshot | null;
  role: StageRole;
  /** Called (throttled) when the gateway has observed enough deltas
   *  that the consumer should re-fetch its snapshot or update its
   *  derived state. The consumer decides the actual cost. */
  onRefresh: () => void;
}): StageView {
  const streamId = snapshot?.stream.id ?? null;
  const audienceCount = snapshot?.audienceCount ?? 0;

  const [mode, setMode] = useState<StageMode>(() => deriveMode(role, audienceCount));

  useEffect(() => {
    setMode(deriveMode(role, audienceCount));
  }, [role, audienceCount]);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!streamId) return;

    // Coalesce bursts of postgres_changes into a single onRefresh call.
    // In normal mode that window is one animation frame (~16 ms); in
    // lite mode we batch every 1 s.
    const windowMs = mode === "lite" ? 1000 : 250;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      pending = null;
      try {
        onRefreshRef.current();
      } catch {
        /* consumer error — never crash the channel */
      }
    };
    const schedule = () => {
      if (pending) return;
      pending = setTimeout(flush, windowMs);
    };

    const channel = supabase.channel(`arena:${streamId}`, {
      config: { broadcast: { ack: false }, presence: { key: "" } },
    });

    // Now-playing flips are cheap and matter to every role.
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "play_tracks",
        filter: `stream_id=eq.${streamId}`,
      },
      schedule,
    );

    // Voters / hosts get the vote delta feed scoped to this stream's
    // tracks. Viewers do NOT — that's the biggest CPU saver because
    // a busy room can fire dozens of vote rows per second.
    if (role !== "viewer") {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "play_tracks",
          filter: `stream_id=eq.${streamId}`,
        },
        schedule,
      );
    }

    channel.subscribe();

    return () => {
      if (pending) clearTimeout(pending);
      supabase.removeChannel(channel);
    };
  }, [streamId, role, mode]);

  return { snapshot, mode, role };
}

function deriveMode(role: StageRole, audience: number): StageMode {
  if (role === "viewer") return "lite";
  if (audience > LITE_AUDIENCE_THRESHOLD) return "lite";
  if (typeof navigator !== "undefined") {
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return "lite";
  }
  return "normal";
}