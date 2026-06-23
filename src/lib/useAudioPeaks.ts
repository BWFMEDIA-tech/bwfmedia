import { useEffect, useState } from "react";

const peaksCache = new Map<string, number[]>();
const inflight = new Map<string, Promise<number[] | null>>();
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  return sharedCtx;
}

async function computePeaks(url: string, bars: number): Promise<number[] | null> {
  const ctx = getCtx();
  if (!ctx) return null;
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const audioBuf = await new Promise<AudioBuffer>((resolve, reject) => {
    ctx.decodeAudioData(buf.slice(0), resolve, reject);
  });
  const channel = audioBuf.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / bars));
  const peaks: number[] = new Array(bars).fill(0);
  for (let i = 0; i < bars; i++) {
    const start = i * blockSize;
    const end = Math.min(channel.length, start + blockSize);
    let max = 0;
    // Sample-stride to keep this O(bars * ~64)
    const stride = Math.max(1, Math.floor((end - start) / 64));
    for (let j = start; j < end; j += stride) {
      const v = Math.abs(channel[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  // Normalise so the loudest peak = 1, then floor each bar for visibility.
  const peak = Math.max(...peaks, 0.0001);
  for (let i = 0; i < bars; i++) {
    peaks[i] = Math.max(0.12, Math.min(1, peaks[i] / peak));
  }
  return peaks;
}

export function useAudioPeaks(url: string | null, bars: number): number[] | null {
  const [peaks, setPeaks] = useState<number[] | null>(() => (url ? peaksCache.get(`${url}|${bars}`) ?? null : null));

  useEffect(() => {
    if (!url) { setPeaks(null); return; }
    const key = `${url}|${bars}`;
    const cached = peaksCache.get(key);
    if (cached) { setPeaks(cached); return; }
    let cancelled = false;
    let promise = inflight.get(key);
    if (!promise) {
      promise = computePeaks(url, bars).catch(() => null);
      inflight.set(key, promise);
      promise.finally(() => inflight.delete(key));
    }
    promise.then((p) => {
      if (cancelled || !p) return;
      peaksCache.set(key, p);
      setPeaks(p);
    });
    return () => { cancelled = true; };
  }, [url, bars]);

  return peaks;
}