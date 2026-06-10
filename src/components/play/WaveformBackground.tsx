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

      // Bright horizontal glow behind the album.
      const cx = w / 2;
      const cy = h / 2;
      const glow = c.createLinearGradient(0, cy, w, cy);
      const ga = 0.4 + intensity * 0.55;
      glow.addColorStop(0, "rgba(0,0,0,0)");
      glow.addColorStop(0.15, `rgba(236, 72, 153, ${ga * 0.8})`);
      glow.addColorStop(0.5, `rgba(139, 92, 246, ${ga})`);
      glow.addColorStop(0.85, `rgba(34, 211, 238, ${ga * 0.85})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = glow;
      c.fillRect(0, cy - h * 0.22, w, h * 0.44);

      // Horizontal mirrored waveform bars extending left & right from album.
      // Album sits in the center; bars fan out to both sides like an EQ.
      const albumHalf = h * 0.5 * 0.62; // ≈ album half-width inside the canvas
      const sideGap = h * 0.04;
      const sideStart = cx + albumHalf + sideGap;
      const sideAvail = w / 2 - (albumHalf + sideGap);
      const bars = 56;
      const barGap = sideAvail / bars;
      const barWidth = Math.max(2, barGap * 0.45);
      const maxBar = h * 0.42;
      const samples = analyser ? data.length : 64;

      c.lineCap = "round";
      for (let i = 0; i < bars; i++) {
        // Sample from low → high freq as bars move outward; nicer EQ shape.
        const freqIdx = Math.floor(((i + 2) / (bars + 4)) * (samples * 0.7));
        const raw = analyser
          ? data[freqIdx] / 255
          : 0.35 + Math.sin(t * 3 + i * 0.35) * 0.25 + Math.sin(t * 1.1 + i * 0.18) * 0.15;
        // Falloff toward outer edges so the shape tapers off naturally.
        const falloff = 1 - Math.pow(i / bars, 1.6) * 0.7;
        const amp = (0.08 + (isPlaying ? Math.max(0, raw) : 0) * 0.95) * falloff;
        const barH = Math.max(barWidth, amp * maxBar);

        // Vivid spectrum: pink → magenta → violet → indigo → cyan.
        const hue = 300 + Math.sin(t * 0.8 + i * 0.18) * 60 + i * 1.4;
        const alpha = Math.min(1, 0.85 + intensity * 0.25);
        const stroke = `hsla(${hue}, 100%, 70%, ${alpha})`;
        c.strokeStyle = stroke;
        c.lineWidth = barWidth;
        c.shadowColor = `hsla(${hue}, 100%, 65%, 1)`;
        c.shadowBlur = 22 * dpr;

        // Right side
        const xR = sideStart + i * barGap;
        c.beginPath();
        c.moveTo(xR, cy - barH / 2);
        c.lineTo(xR, cy + barH / 2);
        c.stroke();

        // Mirrored left side
        const xL = cx - albumHalf - sideGap - i * barGap;
        c.beginPath();
        c.moveTo(xL, cy - barH / 2);
        c.lineTo(xL, cy + barH / 2);
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