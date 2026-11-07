import { useEffect } from "react";
import { usePlayer } from "@/lib/player-context";
import { useSignedAvatarUrl } from "@/lib/useSignedAvatar";

const FALLBACK = [
  { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
];

/**
 * Feeds the shared player into the OS media controls (iPhone Dynamic Island,
 * lock screen, Android notification). Shows the song's artwork, falling back
 * to the Tunevio icon when the track has none.
 */
export function MediaSessionSync() {
  const { track, isPlaying, progress, duration, toggle, pause, next, prev, seek } = usePlayer();
  const cover = useSignedAvatarUrl(track?.coverUrl ?? undefined);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!track) { navigator.mediaSession.metadata = null; return; }
    const artwork = cover
      ? ["96x96", "256x256", "512x512"].map((sizes) => ({ src: cover, sizes }))
      : FALLBACK;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: "Tunevio", artwork });
  }, [track?.id, track?.title, track?.artist, cover]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = track ? (isPlaying ? "playing" : "paused") : "none";
  }, [isPlaying, track]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, h); } catch { /* unsupported */ } };
    set("play", () => toggle());
    set("pause", () => pause());
    set("nexttrack", () => next());
    set("previoustrack", () => prev());
    set("seekto", (d) => { if (typeof d.seekTime === "number") seek(d.seekTime); });
    return () => { (["play", "pause", "nexttrack", "previoustrack", "seekto"] as MediaSessionAction[]).forEach((a) => set(a, null)); };
  }, [toggle, pause, next, prev, seek]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track) return;
    if (!duration || !Number.isFinite(duration)) return;
    try { navigator.mediaSession.setPositionState({ duration, position: Math.min(Math.max(progress, 0), duration), playbackRate: 1 }); } catch { /* ignore */ }
  }, [progress, duration, track]);

  return null;
}
