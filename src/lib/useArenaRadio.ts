import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { estimateServerClockOffset } from "@/lib/audio/arena-sync";

/** Authoritative Arena radio clock (server-written, read-only for clients). */
export type ArenaRadioState = {
  trackId: string | null;
  playing: boolean;
  /** Seconds into the track at `syncAtMs` (server time). */
  positionSeconds: number;
  syncAtMs: number;
};

function rowToState(row: any): ArenaRadioState | null {
  if (!row) return null;
  return {
    trackId: row.current_track_id ?? null,
    playing: !!row.is_playing,
    positionSeconds: Number(row.position_seconds ?? 0),
    syncAtMs: new Date(row.last_sync_at).getTime(),
  };
}

/**
 * Subscribes to the Arena's shared playback clock. Re-fetches on reconnect
 * and tab focus so a client that dropped offline resyncs automatically.
 */
export function useArenaRadio(streamId: string | null) {
  const [state, setState] = useState<ArenaRadioState | null>(null);
  const offsetRef = useRef(0); // serverNow = Date.now() + offset

  useEffect(() => {
    if (!streamId) { setState(null); return; }
    let cancelled = false;
    const fetchState = async () => {
      const { data } = await supabase
        .from("arena_playback_state")
        .select("current_track_id, is_playing, position_seconds, last_sync_at")
        .eq("stream_id", streamId)
        .maybeSingle();
      if (!cancelled) setState(rowToState(data));
    };
    estimateServerClockOffset()
      .then((o) => { offsetRef.current = o; })
      .catch(() => {});
    void fetchState();
    const ch = supabase
      .channel(`arena-radio:${streamId}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arena_playback_state", filter: `stream_id=eq.${streamId}` },
        (p: any) => { if (!cancelled) setState(rowToState(p.new && p.new.stream_id ? p.new : null)); },
      )
      .subscribe((status) => { if (status === "SUBSCRIBED") void fetchState(); });
    const onWake = () => { if (document.visibilityState === "visible") void fetchState(); };
    window.addEventListener("online", fetchState);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      cancelled = true;
      window.removeEventListener("online", fetchState);
      document.removeEventListener("visibilitychange", onWake);
      supabase.removeChannel(ch);
    };
  }, [streamId]);

  /** Where the live broadcast is right now, in seconds. */
  const livePosition = (s: ArenaRadioState | null = state): number => {
    if (!s) return 0;
    if (!s.playing) return s.positionSeconds;
    const serverNow = Date.now() + offsetRef.current;
    return s.positionSeconds + Math.max(0, (serverNow - s.syncAtMs) / 1000);
  };

  return { state, livePosition };
}
