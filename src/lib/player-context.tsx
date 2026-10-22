import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSignedAudioUrl } from "@/lib/useSignedAudio";
import { supabase } from "@/integrations/supabase/client";
import { incrementTrackPlayCount, updatePlaybackProgress } from "@/lib/play-counts.functions";

import { PlaybackProgress } from "@/lib/playback-progress";

/** Fired after a play has been saved; detail = { trackId, playCount }. */
export const PLAY_COUNT_EVENT = "tunevio:play-count";

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string | null;
  durationSec?: number | null;
  artistId?: string | null;
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
  detailTrack: PlayerTrack | null;
  detailQueue: PlayerTrack[];
  openDetails: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  closeDetails: () => void;
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
  const [detailTrack, setDetailTrack] = useState<PlayerTrack | null>(null);
  const [detailQueue, setDetailQueue] = useState<PlayerTrack[]>([]);
  const openDetails = useCallback((track: PlayerTrack, queue?: PlayerTrack[]) => {
    setDetailTrack(track);
    setDetailQueue(queue ?? [track]);
  }, []);
  const closeDetails = useCallback(() => setDetailTrack(null), []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<PlayerState | null>(null);
  const playTokenRef = useRef(0);
  // One pending count per playback start; cleared once the audio really plays.
  const pendingCountRef = useRef<{ token: number; trackId: string } | null>(null);
  const progressSessionRef = useRef<{ trackId: string; progress: PlaybackProgress; eventId: string | null; qualified: boolean; saving: boolean; nextSave: number } | null>(null);
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
  // Restore the last queue (not playback) on this device so it survives a new session.
  const queueRestoredRef = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tunevio:queue") ?? "[]");
      if (Array.isArray(saved) && saved.length) setState((p) => (p.queue.length ? p : { ...p, queue: saved.slice(0, 200) }));
    } catch { /* ignore corrupt storage */ }
    queueRestoredRef.current = true;
  }, []);
  useEffect(() => {
    if (!queueRestoredRef.current) return;
    try { localStorage.setItem("tunevio:queue", JSON.stringify(state.queue.slice(0, 200))); } catch { /* storage full or blocked */ }
  }, [state.queue]);


  const previewLimitHandlerRef = useRef<(() => void) | null>(null);
  const setPreviewLimitHandler = useCallback((fn: (() => void) | null) => {
    previewLimitHandlerRef.current = fn;
  }, []);

  const playAudio = useCallback(async (track: PlayerTrack) => {
    const a = audioRef.current;
    if (!a) return;
    const token = ++playTokenRef.current;
    if (progressSessionRef.current?.trackId !== track.id || a.ended) {
      pendingCountRef.current = { token, trackId: track.id };
      progressSessionRef.current = null;
    } else if (pendingCountRef.current) {
      pendingCountRef.current.token = token;
    }
    const src = (await getSignedAudioUrl(track.audioUrl)) ?? track.audioUrl;
    if (token !== playTokenRef.current || audioRef.current !== a) return;
    if (a.src !== src) a.src = src;
    try {
      await a.play();
    } catch {
      setState((p) => ({ ...p, isPlaying: false }));
    }
  }, []);

  // lazy create audio element on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "metadata";
    a.volume = stateRef.current?.volume ?? 0.8;
    audioRef.current = a;
    const onTime = () => {
      const session = progressSessionRef.current;
      if (session) {
        const seconds = session.progress.sample(a.currentTime, performance.now(), !a.paused, a.seeking);
        if (session.eventId && seconds >= session.nextSave && !session.saving && !session.qualified) {
          session.saving = true;
          session.nextSave = seconds + 5;
          void updatePlaybackProgress({ data: { eventId: session.eventId, seconds } })
            .then((result) => { session.qualified = result.qualified; })
            .catch((error) => console.error("[player] failed to save playback progress", error))
            .finally(() => { session.saving = false; });
        }
      }
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
    const onPlaying = () => {
      progressSessionRef.current?.progress.resetPosition(a.currentTime, performance.now());
      const pending = pendingCountRef.current;
      if (!pending || pending.token !== playTokenRef.current) return;
      pendingCountRef.current = null;
      const session = { trackId: pending.trackId, progress: new PlaybackProgress(), eventId: null as string | null, qualified: false, saving: false, nextSave: 30 };
      session.progress.resetPosition(a.currentTime, performance.now());
      progressSessionRef.current = session;
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return; // signed-out previews are not counted
        try {
          const res = await incrementTrackPlayCount({
            data: { trackId: pending.trackId, playId: `${pending.trackId}:${Date.now()}:${pending.token}` },
          });
          session.eventId = res.eventId;
          window.dispatchEvent(new CustomEvent(PLAY_COUNT_EVENT, {
            detail: { trackId: res.trackId, playCount: res.play_count },
          }));
        } catch (err) {
          console.error("[player] failed to save play", err);
        }
      })();
    };
    const onPause = () => {
      progressSessionRef.current?.progress.resetPosition(a.currentTime, performance.now());
      setState((s) => ({ ...s, isPlaying: false }));
    };
    const onSeek = () => progressSessionRef.current?.progress.resetPosition(a.currentTime, performance.now());
    const onEnd = () => {
      const s = stateRef.current; if (!s) return;
      if (s.repeat === "one") { a.currentTime = 0; a.play().catch(() => {}); return; }
      const idx = s.queue.findIndex((t) => t.id === s.track?.id);
      const nxt = s.queue[idx + 1] ?? (s.repeat === "all" ? s.queue[0] : null);
      if (nxt) {
        void playAudio(nxt);
        setState((p) => ({ ...p, track: nxt, progress: 0, isPlaying: true }));
      } else {
        setState((p) => ({ ...p, isPlaying: false }));
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    a.addEventListener("seeking", onSeek);
    a.addEventListener("seeked", onSeek);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("seeking", onSeek);
      a.removeEventListener("seeked", onSeek);
    };
  }, [playAudio]);

  const play = useCallback((track?: PlayerTrack, queue?: PlayerTrack[]) => {
    const a = audioRef.current; if (!a) return;
    const s = stateRef.current; if (!s) return;
    const t = track ?? s.track; if (!t) return;
    const nextQueue = queue ?? (s.queue.length ? s.queue : [t]);
    void playAudio(t);
    setState((p) => ({ ...p, track: t, queue: nextQueue, isPlaying: true, progress: 0 }));
  }, [playAudio]);

  const pause = useCallback(() => { audioRef.current?.pause(); }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current; const s = stateRef.current;
    if (!a || !s?.track) return;
    if (a.paused) { void playAudio(s.track); } else { a.pause(); }
  }, [playAudio]);

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
    void playAudio(nxt);
    setState((p) => ({ ...p, track: nxt, isPlaying: true, progress: 0 }));
  }, [playAudio]);

  const prev = useCallback(() => {
    const a = audioRef.current; const s = stateRef.current;
    if (!a || !s || !s.queue.length) return;
    // If we're past 3s, restart current track instead of going back
    if (a.currentTime > 3) { a.currentTime = 0; return; }
    const idx = s.queue.findIndex((t) => t.id === s.track?.id);
    const prv = s.queue[idx - 1] ?? (s.repeat === "all" ? s.queue[s.queue.length - 1] : s.queue[0]);
    if (!prv) return;
    void playAudio(prv);
    setState((p) => ({ ...p, track: prv, isPlaying: true, progress: 0 }));
  }, [playAudio]);

  const seek = useCallback((sec: number) => { const a = audioRef.current; if (a) { a.currentTime = sec; setState((s) => ({ ...s, progress: sec })); } }, []);
  const setVolume = useCallback((v: number) => { const a = audioRef.current; if (a) a.volume = v; setState((s) => ({ ...s, volume: v })); }, []);
  const toggleShuffle = useCallback(() => setState((s) => ({ ...s, shuffle: !s.shuffle })), []);
  const cycleRepeat = useCallback(() => setState((s) => ({ ...s, repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })), []);

  const value = useMemo<PlayerApi>(() => ({ ...state, detailTrack, detailQueue, openDetails, closeDetails, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, setPreviewLimitHandler }), [state, detailTrack, detailQueue, openDetails, closeDetails, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, setPreviewLimitHandler]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be used inside PlayerProvider");
  return v;
}