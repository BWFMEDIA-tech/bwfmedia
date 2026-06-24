import { memo, useEffect, useRef } from "react";
import { useSharedAudioGraph, resumeSharedAudio } from "@/lib/useSharedAudioGraph";
import { useRenderActive } from "@/lib/useRenderActive";

/**
 * Live audio-reactive waveform that sits behind album art.
 * Hooks into the SHARED audio graph singleton — never spins up its own
 * AudioContext or MediaElementSource (which would silently fail or, on
 * older browsers, spawn a duplicate context per tab → big CPU hit).
 * Pauses its render loop entirely when the tab is hidden, the canvas
 * is off-screen, the user prefers reduced motion, or the connection
 * is in `saveData` mode.
 */
function WaveformBackgroundImpl({
  audioRef,
  isPlaying,
  trackKey,
  className,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  trackKey?: string | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const intensityRef = useRef(0);
  const graph = useSharedAudioGraph(audioRef);
  const active = useRenderActive(canvasRef);

  // Resume context on play (browsers start it suspended).
  useEffect(() => {
    if (isPlaying) resumeSharedAudio();
  }, [isPlaying, trackKey]);

  // Render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    // PERF: when the loop shouldn't run at all (hidden/off-screen/
    // reduced-motion/save-data) we paint one static frame and bail.
    if (!active) {
      const w = canvas.width;
      const h = canvas.height;
      c.clearRect(0, 0, w, h);
      return;
    }

    let mounted = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const analyser = graph?.analyser ?? null;
    const bufferLength = analyser?.frequencyBinCount ?? 64;
    const data = new Uint8Array(bufferLength);
    let t = 0;

    const draw = () => {
      if (!mounted) return;
      t += 0.016;
      const w = canvas.width;
      const h = canvas.height;
      c.clearRect(0, 0, w, h);

      // Read frequency data or synthesize gentle motion when unavailable.
      let avg = 0;
      if (analyser) {
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < data.length; i++) avg += data[i];
        avg = avg / data.length / 255; // 0..1
      } else {
        avg = 0.15 + Math.sin(t * 1.5) * 0.05;
      }

      // Smooth intensity; fade out when paused.
      const target = isPlaying ? avg : 0;
      intensityRef.current += (target - intensityRef.current) * 0.08;
      const intensity = intensityRef.current;

      // No background fill — bars render on a transparent canvas.
      const cx = w / 2;
      const cy = h / 2;

      // Radial frequency bars + concentric pulse rings, centered on album.
      const samples = analyser ? data.length : 64;
      const innerR = Math.min(w, h) * 0.22; // just outside album edge
      const maxLen = Math.min(w, h) * 0.32;
      const bars = 96;

      c.lineCap = "round";
      for (let i = 0; i < bars; i++) {
        const freqIdx = Math.floor((i / bars) * (samples * 0.7));
        const raw = analyser
          ? data[freqIdx] / 255
          : 0.35 + Math.sin(t * 3 + i * 0.35) * 0.25 + Math.sin(t * 1.1 + i * 0.18) * 0.15;
        const amp = 0.12 + (isPlaying ? Math.max(0, raw) : 0) * 0.95;
        const len = Math.max(2, amp * maxLen);

        const angle = (i / bars) * Math.PI * 2 + t * 0.25;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + len);
        const y2 = cy + Math.sin(angle) * (innerR + len);

        // Blue-leaning spectrum: cyan → azure → indigo.
        const hue = 200 + Math.sin(t * 0.8 + i * 0.12) * 25 + (i / bars) * 40;
        const alpha = Math.min(1, 0.8 + intensity * 0.3);
        c.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
        c.lineWidth = Math.max(2, (Math.min(w, h) / 220) * dpr);
        c.shadowColor = `hsla(${hue}, 100%, 65%, 1)`;
        c.shadowBlur = 18 * dpr;
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
      }

      // Concentric pulse rings that swell with the beat.
      for (let r = 0; r < 3; r++) {
        const phase = (t * 0.6 + r * 0.33) % 1;
        const radius = innerR + phase * maxLen * 1.4;
        const ringAlpha = (1 - phase) * (0.25 + intensity * 0.55);
        const hue = 210 + r * 15 + Math.sin(t + r) * 15;
        c.strokeStyle = `hsla(${hue}, 100%, 72%, ${ringAlpha})`;
        c.lineWidth = Math.max(1.5, 2 * dpr);
        c.shadowColor = `hsla(${hue}, 100%, 60%, ${ringAlpha})`;
        c.shadowBlur = 24 * dpr;
        c.beginPath();
        c.arc(cx, cy, radius, 0, Math.PI * 2);
        c.stroke();
      }
      c.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      mounted = false;
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, trackKey, graph, active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={
        className ??
        "pointer-events-none absolute inset-0 h-full w-full opacity-100 [filter:saturate(1.4)_brightness(1.15)]"
      }
    />
  );
}

/** Memoized: re-renders only when its primitive props change. */
export const WaveformBackground = memo(WaveformBackgroundImpl);