import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayer, type PlayerTrack } from "@/lib/player-context";
import {
  endSession,
  publishSession,
  subscribeSession,
  type Participant,
  type PlaybackState,
  type SessionSnapshot,
} from "@/lib/listening-session";

type Options = {
  streamId: string | null;
  hostUserId: string | null;
  /** Current signed-in user. `null` means anonymous listener (view only). */
  me: { userId: string; displayName?: string | null; avatarUrl?: string | null } | null;
  /** Resolve trackId -> PlayerTrack so listeners can load host's picks. */
  resolveTrack?: (trackId: string) => Promise<PlayerTrack | null> | PlayerTrack | null;
};

const DRIFT_TOLERANCE_MS = 500;
const DRIFT_CHECK_MS = 8000;

/**
 * Synchronizes the global player with a host-authoritative listening session.
 *
 * - Host: player events (play / pause / seek / track change) are pushed to
 *   `arena_playback_state` and broadcast to listeners.
 * - Listener: local player mirrors the host's state; drift is corrected
 *   every ~8s. If the host disappears from presence, playback pauses
 *   locally.
 */
export function useListeningSession({ streamId, hostUserId, me, resolveTrack }: Options) {
  const player = usePlayer();
  const isHost = !!(me && hostUserId && me.userId === hostUserId);

  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Keep latest values available inside stable callbacks.
  const snapRef = useRef<SessionSnapshot | null>(null);
  snapRef.current = snapshot;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const broadcastRef = useRef<((e: any) => void) | null>(null);
  const resolveRef = useRef(resolveTrack);
  resolveRef.current = resolveTrack;
  // Prevent applying our own writes back to the local player.
  const applyingRemoteRef = useRef(false);

  // ---- Subscribe to session ----
  useEffect(() => {
    if (!streamId) {
      setSnapshot(null);
      setParticipants([]);
      return;
    }
    const meParticipant: Participant | null = me
      ? {
          userId: me.userId,
          displayName: me.displayName ?? null,
          avatarUrl: me.avatarUrl ?? null,
          role: hostUserId && me.userId === hostUserId ? "host" : "listener",
          joinedAt: Date.now(),
        }
      : null;

    const sub = subscribeSession({
      streamId,
      hostUserId,
      me: meParticipant,
      onSnapshot: setSnapshot,
      onParticipants: setParticipants,
    });
    broadcastRef.current = sub.broadcast;
    return () => {
      broadcastRef.current = null;
      sub.unsubscribe();
    };
  }, [streamId, hostUserId, me?.userId, me?.displayName, me?.avatarUrl]);

  // ---- Listener: apply remote snapshot to local player ----
  const currentTrackIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isHost || !snapshot) return;
    let cancelled = false;

    const apply = async () => {
      applyingRemoteRef.current = true;
      try {
        // Track change
        if (snapshot.currentTrackId && snapshot.currentTrackId !== currentTrackIdRef.current) {
          currentTrackIdRef.current = snapshot.currentTrackId;
          const track = resolveRef.current
            ? await resolveRef.current(snapshot.currentTrackId)
            : null;
          if (cancelled) return;
          if (track) player.play(track, [track]);
        }
        // Playback state + position (assume server timestamp is fresh)
        const targetSec = snapshot.positionMs / 1000;
        if (Math.abs(player.progress - targetSec) > DRIFT_TOLERANCE_MS / 1000) {
          player.seek(targetSec);
        }
        if (snapshot.playbackState === "playing" && !player.isPlaying) {
          player.toggle();
        } else if (snapshot.playbackState !== "playing" && player.isPlaying) {
          player.pause();
        }
      } finally {
        // Release on the next tick so the player events triggered above
        // don't get echoed back to the host publisher.
        setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
      }
    };
    void apply();
    return () => {
      cancelled = true;
    };
    // Intentionally omit `player` from deps: it re-creates on every player
    // state change and would re-run apply() constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.updatedAtMs, snapshot?.currentTrackId, snapshot?.playbackState, isHost]);

  // ---- Host: publish local player changes ----
  const lastPublishRef = useRef<{ state: PlaybackState; trackId: string | null; posMs: number }>({
    state: "paused",
    trackId: null,
    posMs: 0,
  });

  useEffect(() => {
    if (!isHost || !streamId) return;
    if (applyingRemoteRef.current) return;

    const state: PlaybackState = player.isPlaying ? "playing" : "paused";
    const trackId = player.track?.id ?? null;
    const posMs = Math.round(player.progress * 1000);
    const last = lastPublishRef.current;

    // Publish on: state flip, track change, or seek jump (>1s vs monotonic drift).
    const trackChanged = trackId !== last.trackId;
    const stateChanged = state !== last.state;
    const bigSeek = Math.abs(posMs - last.posMs) > 1500 && !player.isPlaying;
    if (!trackChanged && !stateChanged && !bigSeek) return;

    lastPublishRef.current = { state, trackId, posMs };

    void publishSession({
      streamId,
      trackId,
      positionMs: posMs,
      playbackState: state,
    });
    broadcastRef.current?.({
      type: trackChanged
        ? "track_change"
        : stateChanged
          ? state === "playing"
            ? "player_play"
            : "player_pause"
          : "player_seek",
      trackId: trackId ?? "",
      positionMs: posMs,
      ts: Date.now(),
    } as any);
  }, [isHost, streamId, player.isPlaying, player.track?.id, player.progress]);

  // ---- Host: periodic position heartbeat so late joiners get accurate pos ----
  useEffect(() => {
    if (!isHost || !streamId) return;
    const interval = setInterval(() => {
      if (!player.isPlaying) return;
      void publishSession({
        streamId,
        trackId: player.track?.id ?? null,
        positionMs: Math.round(player.progress * 1000),
        playbackState: "playing",
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isHost, streamId, player.isPlaying, player.track?.id, player.progress]);

  // ---- Listener: drift correction ----
  useEffect(() => {
    if (isHost) return;
    const interval = setInterval(() => {
      const snap = snapRef.current;
      if (!snap || snap.playbackState !== "playing") return;
      // Estimate server position now: last known + elapsed since last_sync_at
      const elapsed = Date.now() - snap.updatedAtMs;
      const serverPosSec = (snap.positionMs + elapsed) / 1000;
      if (Math.abs(player.progress - serverPosSec) > DRIFT_TOLERANCE_MS / 1000) {
        applyingRemoteRef.current = true;
        player.seek(serverPosSec);
        setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
      }
    }, DRIFT_CHECK_MS);
    return () => clearInterval(interval);
  }, [isHost, player]);

  // ---- Listener: host disconnect -> pause locally ----
  const hostPresent = useMemo(
    () => (hostUserId ? participants.some((p) => p.userId === hostUserId) : false),
    [participants, hostUserId],
  );
  useEffect(() => {
    if (isHost || !snapshot) return;
    if (!hostPresent && player.isPlaying) {
      applyingRemoteRef.current = true;
      player.pause();
      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 0);
    }
  }, [hostPresent, isHost, snapshot, player]);

  const listeners = useMemo(() => participants.filter((p) => p.role === "listener"), [participants]);

  const leaveSession = useCallback(async () => {
    if (isHost && streamId) await endSession(streamId);
  }, [isHost, streamId]);

  return {
    isHost,
    snapshot,
    participants,
    listeners,
    listenerCount: listeners.length,
    hostPresent,
    leaveSession,
  };
}