import { useEffect, useRef } from "react";

/**
 * Live audio-reactive waveform that sits behind album art.
 * Hooks into an existing <audio> element via a shared ref so it stays in
 * sync with the global player state (no separate audio element).
 */
export function WaveformBackground({
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
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const intensityRef = useRef(0);

  // Wire the audio element into a single AudioContext + Analyser.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (sourceRef.current) return; // already wired for this element

    try {
      const AC: typeof AudioContext =
        (window.AudioContext as any) || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch {
      // createMediaElementSource throws if already wired or on CORS-tainted media;
      // we fall back to a silent visualizer that still fades with isPlaying.
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef.current]);

  // Resume context on play (browsers start it suspended).
  useEffect(() => {
    if (isPlaying && ctxRef.current?.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
  }, [isPlaying, trackKey]);

  // Render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

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

    const analyser = analyserRef.current;
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

        const hue = 300 + Math.sin(t * 0.8 + i * 0.12) * 60 + i * 1.2;
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
        const hue = 280 + r * 30 + Math.sin(t + r) * 20;
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
  }, [isPlaying, trackKey]);

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