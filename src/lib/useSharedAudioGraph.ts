import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Shared audio graph for the Play Arena player and its visualizers.
 *
 * The browser only allows ONE MediaElementSource per `<audio>` element
 * for the lifetime of the element. Each component that wanted its own
 * `AudioContext` (ImmersivePlayer + WaveformBackground both did) was
 * either silently failing (CORS/double-wire) or, worse, spawning a
 * second AudioContext per tab — every extra context costs ~5–10 % CPU
 * on mobile and contributes to overheating.
 *
 * This module owns ONE `AudioContext` per device and ONE
 * MediaElementSource per `<audio>` element, with a single fan-out
 * `AnalyserNode` + master `GainNode` that every consumer reads from.
 */

import { getSharedAudioContext, resumeAudioContext } from "@/lib/audio/audio-clock";

type Graph = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  gain: GainNode;
  /** Local speaker output (volume / mute for THIS device only). */
  localOut: GainNode;
  /** Broadcast tap: full-level music for the live stream. */
  broadcast: MediaStreamAudioDestinationNode;
};

/* ---- Arena live-broadcast bridge ----
 * Host: the player's music is tapped into a MediaStream that the live room
 * publishes as one audio track, so every listener hears the host's exact
 * playback. Listener: when that track is being received, the local copy is
 * silenced so nobody hears the song twice. */
type Listener = () => void;
const bridgeListeners = new Set<Listener>();
let hostMusicStream: MediaStream | null = null;
let remoteMusicActive = false;
let localVolume = 1;
const allGraphs = new Set<Graph>();
const emit = () => bridgeListeners.forEach((l) => l());
function applyLocal() {
  allGraphs.forEach((g) => {
    const v = remoteMusicActive && !hostMusicStream ? 0 : localVolume;
    g.localOut.gain.setTargetAtTime(v, g.ctx.currentTime, 0.05);
  });
}
export const arenaBroadcast = {
  subscribe(l: Listener) { bridgeListeners.add(l); return () => { bridgeListeners.delete(l); }; },
  getHostStream: () => hostMusicStream,
  setHostStream(s: MediaStream | null) { hostMusicStream = s; applyLocal(); emit(); },
  isRemoteActive: () => remoteMusicActive,
  setRemoteActive(v: boolean) { if (remoteMusicActive === v) return; remoteMusicActive = v; applyLocal(); emit(); },
  setLocalVolume(v: number) { localVolume = v; applyLocal(); emit(); },
  getLocalVolume: () => localVolume,
};
export function getGraphFor(el: HTMLMediaElement | null): Graph | null {
  return el ? graphs.get(el) ?? null : null;
}

const graphs = new WeakMap<HTMLMediaElement, Graph>();

// The AudioContext singleton now lives in audio-clock.ts so the Arena slot
// engine and this media-element graph share ONE context.
function getSharedCtx(): AudioContext | null {
  return getSharedAudioContext();
}

/**
 * Returns the shared graph for the given `<audio>` element, lazily
 * wiring it on first use. Returns `null` until the ref is attached.
 * Subsequent callers (a second component on the same page) get the
 * exact same nodes back — never a duplicate context, never a duplicate
 * MediaElementSource.
 */
export function useSharedAudioGraph(
  audioRef: React.RefObject<HTMLAudioElement | null>,
): Graph | null {
  const [, force] = useState(0);
  const lastEl = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || lastEl.current === el) return;
    lastEl.current = el;

    if (graphs.has(el)) {
      force((n) => n + 1);
      return;
    }
    const ctx = getSharedCtx();
    if (!ctx) return;
    try {
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      source.connect(analyser);
      analyser.connect(gain);
      const localOut = ctx.createGain();
      const broadcast = ctx.createMediaStreamDestination();
      gain.connect(localOut);
      localOut.connect(ctx.destination);
      gain.connect(broadcast);
      const g = { ctx, source, analyser, gain, localOut, broadcast };
      graphs.set(el, g);
      allGraphs.add(g);
      applyLocal();
      force((n) => n + 1);
    } catch {
      /* element already wired (HMR/StrictMode double mount) — ignore */
    }
    // intentionally re-run when the underlying element identity changes
  }, [audioRef, audioRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    const el = audioRef.current;
    return el ? graphs.get(el) ?? null : null;
    // re-evaluate after the effect bumps `force`
  }, [audioRef, audioRef.current, lastEl.current]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Resume the shared context — call from a user gesture (play/tap). */
export function resumeSharedAudio(): void {
  resumeAudioContext();
}