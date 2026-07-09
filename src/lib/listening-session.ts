import { supabase } from "@/integrations/supabase/client";

/**
 * Shared listening session built on `arena_playback_state`.
 *
 * - Host writes to the row (RLS + `arena_playback_state_guard` enforce that
 *   only the stream host / admin can mutate playback).
 * - Listeners subscribe to postgres_changes + a broadcast channel for
 *   low-latency play/pause/seek/track events, and use Supabase channel
 *   presence to expose live participant / listener counts.
 *
 * A "session" is identified by a `streamId` — one row per stream. This lets
 * us reuse the existing host-guard trigger and realtime infra rather than
 * introduce a parallel schema.
 */

export type PlaybackState = "playing" | "paused" | "stopped";

export type SessionSnapshot = {
  streamId: string;
  hostUserId: string | null;
  currentTrackId: string | null;
  playbackState: PlaybackState;
  positionMs: number;
  /** Server wall-clock (ms) captured at the moment the row was written. */
  updatedAtMs: number;
};

export type SessionEvent =
  | { type: "player_play"; positionMs: number; trackId: string | null; ts: number }
  | { type: "player_pause"; positionMs: number; ts: number }
  | { type: "player_seek"; positionMs: number; ts: number }
  | { type: "track_change"; trackId: string; positionMs: number; ts: number }
  | { type: "queue_updated"; ts: number }
  | { type: "session_ended"; ts: number };

export type Participant = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: "host" | "listener";
  joinedAt: number;
};

function rowToSnapshot(row: any, hostUserId: string | null): SessionSnapshot | null {
  if (!row) return null;
  const updatedAtMs = row.last_sync_at ? new Date(row.last_sync_at).getTime() : Date.now();
  return {
    streamId: row.stream_id,
    hostUserId,
    currentTrackId: (row.current_track_id as string | null) ?? null,
    playbackState: row.is_playing ? "playing" : "paused",
    positionMs: Math.max(0, Math.round(Number(row.position_seconds ?? 0) * 1000)),
    updatedAtMs,
  };
}

/** Host: publish a new authoritative snapshot. */
export async function publishSession(input: {
  streamId: string;
  trackId: string | null;
  positionMs: number;
  playbackState: PlaybackState;
}): Promise<void> {
  const { error } = await supabase.from("arena_playback_state").upsert(
    {
      stream_id: input.streamId,
      current_track_id: input.trackId,
      position_seconds: Math.max(0, input.positionMs / 1000),
      is_playing: input.playbackState === "playing",
      last_sync_at: new Date().toISOString(),
    } as any,
    { onConflict: "stream_id" },
  );
  if (error) throw new Error(error.message);
}

/** Host: end the session. */
export async function endSession(streamId: string): Promise<void> {
  await supabase
    .from("arena_playback_state")
    .update({ is_playing: false } as any)
    .eq("stream_id", streamId);
}

/** Read the current snapshot once. */
export async function fetchSession(
  streamId: string,
  hostUserId: string | null,
): Promise<SessionSnapshot | null> {
  const { data } = await supabase
    .from("arena_playback_state")
    .select("stream_id, current_track_id, position_seconds, is_playing, last_sync_at")
    .eq("stream_id", streamId)
    .maybeSingle();
  return rowToSnapshot(data, hostUserId);
}

/**
 * Subscribe to authoritative state + presence for a session.
 * Returns an unsubscribe function and a `broadcast` for host-side events.
 */
export function subscribeSession(opts: {
  streamId: string;
  hostUserId: string | null;
  me: Participant | null;
  onSnapshot: (snap: SessionSnapshot | null) => void;
  onEvent?: (event: SessionEvent) => void;
  onParticipants?: (participants: Participant[]) => void;
}): { unsubscribe: () => void; broadcast: (event: SessionEvent) => void } {
  const { streamId, hostUserId, me, onSnapshot, onEvent, onParticipants } = opts;
  let cancelled = false;

  const refresh = async () => {
    const snap = await fetchSession(streamId, hostUserId);
    if (!cancelled) onSnapshot(snap);
  };
  void refresh();

  const channel = supabase.channel(`listen-session:${streamId}`, {
    config: { presence: { key: me?.userId ?? crypto.randomUUID() } },
  });

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "arena_playback_state",
        filter: `stream_id=eq.${streamId}`,
      },
      (payload) => {
        const snap = rowToSnapshot(payload.new, hostUserId);
        if (!cancelled) onSnapshot(snap);
      },
    )
    .on("broadcast", { event: "session" }, (msg) => {
      if (cancelled || !onEvent) return;
      onEvent(msg.payload as SessionEvent);
    })
    .on("presence", { event: "sync" }, () => {
      if (cancelled || !onParticipants) return;
      const state = channel.presenceState() as Record<string, Participant[]>;
      const flat: Participant[] = [];
      for (const key of Object.keys(state)) {
        const list = state[key];
        if (list && list.length) flat.push(list[0]);
      }
      onParticipants(flat);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (me) await channel.track(me);
        void refresh();
      }
    });

  const broadcast = (event: SessionEvent) => {
    void channel.send({ type: "broadcast", event: "session", payload: event });
  };

  return {
    broadcast,
    unsubscribe: () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    },
  };
}