import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string | null;
  durationSec?: number | null;
  /** When true, playback is capped at PREVIEW_LIMIT_SEC seconds. */
  preview?: boolean;
}

export const PREVIEW_LIMIT_SEC = 30;

interface PlayerState {
  track: PlayerTrack | null;
  queue: PlayerTrack[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
}

interface PlayerApi extends PlayerState {
  play: (track?: PlayerTrack, queue?: PlayerTrack[]) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPreviewLimitHandler: (fn: (() => void) | null) => void;
}

const Ctx = createContext<PlayerApi | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<PlayerState | null>(null);
  const [state, setState] = useState<PlayerState>({
    track: null,
    queue: [],
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    repeat: "off",
  });
  stateRef.current = state;

  const previewLimitHandlerRef = useRef<(() => void) | null>(null);
  const setPreviewLimitHandler = useCallback((fn: (() => void) | null) => {
    previewLimitHandlerRef.current = fn;
  }, []);

  // lazy create audio element on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "metadata";
    a.volume = stateRef.current?.volume ?? 0.8;
    audioRef.current = a;
    const onTime = () => {
      const s = stateRef.current;
      if (s?.track?.preview && a.currentTime >= PREVIEW_LIMIT_SEC) {
        a.pause();
        a.currentTime = 0;
        setState((p) => ({ ...p, isPlaying: false, progress: 0 }));
        previewLimitHandlerRef.current?.();
        return;
      }
      setState((s2) => ({ ...s2, progress: a.currentTime }));
    };
    const onMeta = () => setState((s) => ({ ...s, duration: a.duration || 0 }));
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onEnd = () => {
      const s = stateRef.current; if (!s) return;
      if (s.repeat === "one") { a.currentTime = 0; a.play().catch(() => {}); return; }
      const idx = s.queue.findIndex((t) => t.id === s.track?.id);
      const nxt = s.queue[idx + 1] ?? (s.repeat === "all" ? s.queue[0] : null);
      if (nxt) {
        a.src = nxt.audioUrl; a.play().catch(() => {});
        setState((p) => ({ ...p, track: nxt, progress: 0, isPlaying: true }));
      } else {
        setState((p) => ({ ...p, isPlaying: false }));
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const play = useCallback((track?: PlayerTrack, queue?: PlayerTrack[]) => {
    const a = audioRef.current; if (!a) return;
    const s = stateRef.current!;
    const t = track ?? s.track; if (!t) return;
    const nextQueue = queue ?? (s.queue.length ? s.queue : [t]);
    if (a.src !== t.audioUrl) { a.src = t.audioUrl; }
    a.play().catch(() => { setState((p) => ({ ...p, isPlaying: false })); });
    setState((p) => ({ ...p, track: t, queue: nextQueue, isPlaying: true, progress: 0 }));
  }, []);

  const pause = useCallback(() => { audioRef.current?.pause(); }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current; const s = stateRef.current;
    if (!a || !s?.track) return;
    if (a.paused) { a.play().catch(() => {}); } else { a.pause(); }
  }, []);

  const next = useCallback(() => {
    const a = audioRef.current; const s = stateRef.current;
    if (!a || !s || !s.queue.length) return;
    const idx = s.queue.findIndex((t) => t.id === s.track?.id);
    let nxt: PlayerTrack | null;
    if (s.shuffle && s.queue.length > 1) {
      let r = idx;
      while (r === idx) r = Math.floor(Math.random() * s.queue.length);
      nxt = s.queue[r];
    } else {
      nxt = s.queue[idx + 1] ?? (s.repeat === "all" ? s.queue[0] : null);
    }
    if (!nxt) return;
    a.src = nxt.audioUrl; a.play().catch(() => {});
    setState((p) => ({ ...p, track: nxt, isPlaying: true, progress: 0 }));
  }, []);

  const prev = useCallback(() => {
    const a = audioRef.current; const s = stateRef.current;
    if (!a || !s || !s.queue.length) return;
    // If we're past 3s, restart current track instead of going back
    if (a.currentTime > 3) { a.currentTime = 0; return; }
    const idx = s.queue.findIndex((t) => t.id === s.track?.id);
    const prv = s.queue[idx - 1] ?? (s.repeat === "all" ? s.queue[s.queue.length - 1] : s.queue[0]);
    if (!prv) return;
    a.src = prv.audioUrl; a.play().catch(() => {});
    setState((p) => ({ ...p, track: prv, isPlaying: true, progress: 0 }));
  }, []);

  const seek = useCallback((sec: number) => { const a = audioRef.current; if (a) { a.currentTime = sec; setState((s) => ({ ...s, progress: sec })); } }, []);
  const setVolume = useCallback((v: number) => { const a = audioRef.current; if (a) a.volume = v; setState((s) => ({ ...s, volume: v })); }, []);
  const toggleShuffle = useCallback(() => setState((s) => ({ ...s, shuffle: !s.shuffle })), []);
  const cycleRepeat = useCallback(() => setState((s) => ({ ...s, repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })), []);

  const value = useMemo<PlayerApi>(() => ({ ...state, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, setPreviewLimitHandler }), [state, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, setPreviewLimitHandler]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be used inside PlayerProvider");
  return v;
}