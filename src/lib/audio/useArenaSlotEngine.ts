import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signAudioUrl } from "@/lib/signed-audio.functions";
import { ArenaAudioClock, getSharedAudioContext, resumeAudioContext } from "./audio-clock";
import { ArenaSlotEngine, type SlotEngineOptions } from "./arena-slot-engine";
import { preloadQueue } from "./preload-engine";
import { TrackBufferLoader, type TrackAudioSource } from "./track-loader";
import { isVotingOpenAt, type SlotPosition } from "./slot-scheduler";
import {
  estimateServerClockOffset,
  publishSlotEpoch,
  stopSlotPlayback,
  subscribeSlotEpoch,
  type ArenaSyncState,
} from "./arena-sync";

export type ArenaQueueTrack = TrackAudioSource; // { trackId, audioUrl }

export type ArenaSlotEngineStatus =
  | "idle"
  | "syncing"
  | "preloading"
  | "playing"
  | "ended"
  | "suspended"
  | "error";

/**
 * React binding for the Arena slot engine.
 *
 * - Subscribes to the stream's published slot epoch (arena-sync)
 * - Preloads the whole queue, then pre-schedules every slot
 * - Exposes the live SlotPosition + voting window for the Arena UI
 * - hostStart()/hostStop() publish/clear the shared epoch (host only —
 *   enforced by arena_playback_state RLS)
 *
 * Browsers require a user gesture before audio can play: when status is
 * "suspended", call resumeAudio() from a tap/click handler.
 */
export function useArenaSlotEngine(opts: {
  streamId: string | null;
  queue: ArenaQueueTrack[];
  enabled?: boolean;
  engine?: SlotEngineOptions;
}) {
  const { streamId, queue, enabled = true } = opts;
  const [status, setStatus] = useState<ArenaSlotEngineStatus>("idle");
  const [position, setPosition] = useState<SlotPosition | null>(null);
  const [preload, setPreload] = useState({ loaded: 0, total: 0 });
  const [failedTracks, setFailedTracks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clockRef = useRef<ArenaAudioClock | null>(null);
  const engineRef = useRef<ArenaSlotEngine | null>(null);
  const loaderRef = useRef<TrackBufferLoader | null>(null);
  const syncStateRef = useRef<ArenaSyncState | null>(null);
  const startedEpochRef = useRef<number | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const engineOptions = opts.engine;

  const ensureInfra = useCallback((): {
    ctx: AudioContext;
    clock: ArenaAudioClock;
    engine: ArenaSlotEngine;
    loader: TrackBufferLoader;
  } | null => {
    const ctx = getSharedAudioContext();
    if (!ctx) return null;
    if (!clockRef.current) clockRef.current = new ArenaAudioClock(ctx);
    if (!loaderRef.current) {
      loaderRef.current = new TrackBufferLoader(ctx, async (url) => {
        const res = await signAudioUrl({ data: { url } });
        return (res as { url: string | null })?.url ?? url;
      });
    }
    if (!engineRef.current) {
      engineRef.current = new ArenaSlotEngine(ctx, clockRef.current, engineOptions, {
        onSlotChange: (pos) => setPosition(pos),
        onEnded: () => setStatus("ended"),
      });
    }
    return {
      ctx,
      clock: clockRef.current,
      engine: engineRef.current,
      loader: loaderRef.current,
    };
  }, [engineOptions]);

  const startFromEpoch = useCallback(
    async (epochStartMs: number) => {
      const infra = ensureInfra();
      if (!infra) return;
      const { ctx, clock, engine, loader } = infra;
      if (startedEpochRef.current === epochStartMs) return; // already scheduled
      try {
        setStatus("syncing");
        if (!clock.isSynced) {
          clock.setOffsetMs(await estimateServerClockOffset());
        }
        const tracks = queueRef.current;
        setStatus("preloading");
        setPreload({ loaded: 0, total: tracks.length });
        const { buffers, failed } = await preloadQueue(tracks, (t, s) => loader.load(t, s), {
          onProgress: (loaded, total) => setPreload({ loaded, total }),
        });
        setFailedTracks(failed);
        engine.start(tracks, buffers, epochStartMs);
        startedEpochRef.current = epochStartMs;
        setPosition(engine.position());
        setStatus(ctx.state === "suspended" ? "suspended" : "playing");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start slot playback");
        setStatus("error");
      }
    },
    [ensureInfra],
  );

  // Follow the published epoch for this stream.
  useEffect(() => {
    if (!streamId || !enabled) return;
    const unsubscribe = subscribeSlotEpoch(streamId, (state) => {
      syncStateRef.current = state;
      if (!state || !state.isPlaying) {
        engineRef.current?.stop();
        startedEpochRef.current = null;
        setPosition(null);
        setStatus("idle");
        return;
      }
      void startFromEpoch(state.epochStartMs);
    });
    return () => {
      unsubscribe();
      engineRef.current?.stop();
      startedEpochRef.current = null;
    };
  }, [streamId, enabled, startFromEpoch]);

  const resumeAudio = useCallback(() => {
    resumeAudioContext();
    if (engineRef.current && startedEpochRef.current !== null) setStatus("playing");
  }, []);

  const hostStart = useCallback(async () => {
    if (!streamId) return;
    const infra = ensureInfra();
    if (!infra) return;
    resumeAudioContext();
    if (!infra.clock.isSynced) {
      infra.clock.setOffsetMs(await estimateServerClockOffset());
    }
    await publishSlotEpoch({
      streamId,
      clockOffsetMs: infra.clock.clockOffsetMs,
      firstTrackId: queueRef.current[0]?.trackId ?? null,
    });
    // Playback starts via the same subscription path every viewer uses.
  }, [streamId, ensureInfra]);

  const hostStop = useCallback(async () => {
    if (!streamId) return;
    await stopSlotPlayback(streamId);
  }, [streamId]);

  const votingOpen = useMemo(() => {
    if (!position?.slot) return false;
    const clock = clockRef.current;
    if (!clock) return false;
    return isVotingOpenAt(position.slot, clock.serverNowMs());
  }, [position]);

  return {
    status,
    error,
    position,
    votingOpen,
    currentTrackId: position?.slot?.trackId ?? null,
    preloadProgress: preload,
    failedTracks,
    resumeAudio,
    hostStart,
    hostStop,
    masterGain: engineRef.current?.masterGain ?? null,
  };
}
