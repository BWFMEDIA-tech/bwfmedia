import { supabase } from "@/integrations/supabase/client";
import { getServerTime } from "@/lib/server-time.functions";
import { estimateClockOffsetMs } from "./audio-clock";
import { epochFromSyncRow } from "./slot-scheduler";

/**
 * Server synchronization for the Arena slot engine.
 *
 * The shared timeline is one row in arena_playback_state (host-writable,
 * world-readable, realtime-enabled):
 *   epochMs = last_sync_at - position_seconds * 1000
 * Every client derives the identical epoch from the identical row, so the
 * timeline is mutually consistent even if the publisher's clock is off —
 * an absolute skew shifts everyone equally.
 *
 * Clock offset (client -> server) is estimated once per session via the
 * getServerTime server fn with RTT halving; the engine maps the epoch onto
 * the local AudioContext with it.
 */

export type ArenaSyncState = {
  epochStartMs: number;
  isPlaying: boolean;
  currentTrackId: string | null;
  updatedAt: string;
};

export async function estimateServerClockOffset(samples = 3): Promise<number> {
  const offsets: number[] = [];
  for (let i = 0; i < samples; i++) {
    const sent = Date.now();
    const { nowMs } = await getServerTime();
    offsets.push(estimateClockOffsetMs(nowMs, sent, Date.now()));
  }
  // Median is robust against one slow round trip.
  offsets.sort((a, b) => a - b);
  return offsets[Math.floor(offsets.length / 2)];
}

function rowToState(row: any): ArenaSyncState | null {
  if (!row || !row.last_sync_at) return null;
  return {
    epochStartMs: epochFromSyncRow(row.last_sync_at, Number(row.position_seconds ?? 0)),
    isPlaying: !!row.is_playing,
    currentTrackId: (row.current_track_id as string | null) ?? null,
    updatedAt: (row.updated_at as string) ?? row.last_sync_at,
  };
}

/**
 * Host: publish the slot epoch. Writes are expressed in estimated SERVER
 * time so the row is accurate for every reader regardless of the host's
 * local clock. `leadInMs` gives clients time to receive the row and
 * pre-schedule before slot 0 begins.
 */
export async function publishSlotEpoch(opts: {
  streamId: string;
  clockOffsetMs: number;
  leadInMs?: number;
  firstTrackId?: string | null;
}): Promise<number> {
  const serverNowMs = Date.now() + opts.clockOffsetMs;
  const epochStartMs = serverNowMs + (opts.leadInMs ?? 3000);
  const { error } = await supabase.from("arena_playback_state").upsert(
    {
      stream_id: opts.streamId,
      is_playing: true,
      current_track_id: opts.firstTrackId ?? null,
      // position relative to the epoch at the moment of this write:
      position_seconds: (serverNowMs - epochStartMs) / 1000,
      last_sync_at: new Date(serverNowMs).toISOString(),
    } as any,
    { onConflict: "stream_id" },
  );
  if (error) throw new Error(error.message);
  return epochStartMs;
}

/** Host: stop shared playback for the stream. */
export async function stopSlotPlayback(streamId: string): Promise<void> {
  const { error } = await supabase
    .from("arena_playback_state")
    .update({ is_playing: false } as any)
    .eq("stream_id", streamId);
  if (error) throw new Error(error.message);
}

/**
 * Subscribe to the stream's slot epoch: initial fetch + realtime updates.
 * Returns an unsubscribe function.
 */
export function subscribeSlotEpoch(
  streamId: string,
  onState: (state: ArenaSyncState | null) => void,
): () => void {
  let cancelled = false;

  const fetchState = async () => {
    const { data } = await supabase
      .from("arena_playback_state")
      .select("stream_id, current_track_id, position_seconds, is_playing, last_sync_at, updated_at")
      .eq("stream_id", streamId)
      .maybeSingle();
    if (!cancelled) onState(rowToState(data));
  };
  void fetchState();

  const channel = supabase
    .channel(`arena-slots:${streamId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "arena_playback_state",
        filter: `stream_id=eq.${streamId}`,
      },
      (payload) => {
        onState(rowToState(payload.new));
      },
    )
    .subscribe((status) => {
      // Heal missed epochs: re-read the row on every (re)join so a client
      // that dropped offline mid-battle converges as soon as it reconnects.
      if (status === "SUBSCRIBED") void fetchState();
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`[arena-slots:${streamId}] realtime channel ${status}`);
      }
    });

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
