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

      // Radial gradient background pulse.
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.35;
      const pulseR = baseR * (1 + intensity * 0.6);
      const grad = c.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, pulseR);
      grad.addColorStop(0, `rgba(139, 92, 246, ${0.35 * (0.4 + intensity)})`);
      grad.addColorStop(0.6, `rgba(59, 130, 246, ${0.18 * (0.4 + intensity)})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = grad;
      c.fillRect(0, 0, w, h);

      // Bar ring around the album.
      const bars = 72;
      const ringR = Math.min(w, h) * 0.42;
      const maxBar = Math.min(w, h) * 0.18;
      c.save();
      c.translate(cx, cy);
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor((i / bars) * (analyser ? data.length : 64));
        const v = analyser
          ? data[idx] / 255
          : 0.3 + Math.sin(t * 2 + i * 0.25) * 0.2;
        const len = (0.15 + (isPlaying ? v : 0) * 0.85) * maxBar;
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const x1 = Math.cos(angle) * ringR;
        const y1 = Math.sin(angle) * ringR;
        const x2 = Math.cos(angle) * (ringR + len);
        const y2 = Math.sin(angle) * (ringR + len);
        const alpha = 0.25 + intensity * 0.5;
        c.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
        c.lineWidth = Math.max(2, (Math.min(w, h) / 240) * dpr);
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
      }
      c.restore();

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
        "pointer-events-none absolute inset-0 h-full w-full opacity-70 [filter:blur(2px)]"
      }
    />
  );
}