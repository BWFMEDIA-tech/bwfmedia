import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string | null;
  durationSec?: number | null;
}

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
}

const Ctx = createContext<PlayerApi | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // lazy create audio element on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "metadata";
    a.volume = state.volume;
    audioRef.current = a;
    const onTime = () => setState((s) => ({ ...s, progress: a.currentTime }));
    const onMeta = () => setState((s) => ({ ...s, duration: a.duration || 0 }));
    const onEnd = () => {
      setState((s) => {
        if (s.repeat === "one") { a.currentTime = 0; a.play(); return s; }
        const idx = s.queue.findIndex((t) => t.id === s.track?.id);
        const next = s.queue[idx + 1] ?? (s.repeat === "all" ? s.queue[0] : null);
        if (next) { a.src = next.audioUrl; a.play(); return { ...s, track: next, progress: 0 }; }
        return { ...s, isPlaying: false };
      });
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => { a.pause(); a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onMeta); a.removeEventListener("ended", onEnd); };
  }, []);

  const play = useCallback((track?: PlayerTrack, queue?: PlayerTrack[]) => {
    const a = audioRef.current; if (!a) return;
    setState((s) => {
      const t = track ?? s.track; if (!t) return s;
      if (a.src !== t.audioUrl) a.src = t.audioUrl;
      a.play().catch(() => {});
      return { ...s, track: t, queue: queue ?? s.queue, isPlaying: true };
    });
  }, []);

  const pause = useCallback(() => { audioRef.current?.pause(); setState((s) => ({ ...s, isPlaying: false })); }, []);
  const toggle = useCallback(() => { const a = audioRef.current; if (!a || !state.track) return; if (a.paused) { a.play(); setState((s) => ({ ...s, isPlaying: true })); } else { a.pause(); setState((s) => ({ ...s, isPlaying: false })); } }, [state.track]);

  const next = useCallback(() => {
    setState((s) => {
      if (!s.queue.length) return s;
      const idx = s.queue.findIndex((t) => t.id === s.track?.id);
      const nxt = s.shuffle ? s.queue[Math.floor(Math.random() * s.queue.length)] : (s.queue[idx + 1] ?? (s.repeat === "all" ? s.queue[0] : null));
      if (!nxt) return s;
      const a = audioRef.current; if (a) { a.src = nxt.audioUrl; a.play().catch(() => {}); }
      return { ...s, track: nxt, isPlaying: true, progress: 0 };
    });
  }, []);

  const prev = useCallback(() => {
    setState((s) => {
      if (!s.queue.length) return s;
      const idx = s.queue.findIndex((t) => t.id === s.track?.id);
      const prv = s.queue[idx - 1] ?? s.queue[s.queue.length - 1];
      if (!prv) return s;
      const a = audioRef.current; if (a) { a.src = prv.audioUrl; a.play().catch(() => {}); }
      return { ...s, track: prv, isPlaying: true, progress: 0 };
    });
  }, []);

  const seek = useCallback((sec: number) => { const a = audioRef.current; if (a) { a.currentTime = sec; setState((s) => ({ ...s, progress: sec })); } }, []);
  const setVolume = useCallback((v: number) => { const a = audioRef.current; if (a) a.volume = v; setState((s) => ({ ...s, volume: v })); }, []);
  const toggleShuffle = useCallback(() => setState((s) => ({ ...s, shuffle: !s.shuffle })), []);
  const cycleRepeat = useCallback(() => setState((s) => ({ ...s, repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })), []);

  const value = useMemo<PlayerApi>(() => ({ ...state, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat }), [state, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be used inside PlayerProvider");
  return v;
}