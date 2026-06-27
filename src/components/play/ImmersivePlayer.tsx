import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, Share2,
  Volume2, VolumeX, ListMusic, Moon, Gauge, Sparkles, Radio, BadgeCheck,
  Users, MessageCircle, Trophy, Zap, ChevronUp, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyVote, type PlayTrack } from "@/lib/usePlayQueue";
import { votePlayTrack, advancePlayQueue, playTrackNow, reorderPlayQueue, deletePlayTrack } from "@/lib/play.functions";
import { RankBadge } from "@/components/rank/RankBadge";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, arrayMove,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useSharedAudioGraph, resumeSharedAudio } from "@/lib/useSharedAudioGraph";
import { useRenderActive } from "@/lib/useRenderActive";
import { SignedImg } from "@/components/ui/signed-img";

/* ============================================================
   Brand palette (BWF):
   purple #C53DFF · magenta #FF00A6 · cyan #00E6FF · blue #004BFF
============================================================ */

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

type VisMode = "ring" | "bars" | "particles";

/* ---------- Web Audio: analyser + normalizer gain ----------
   Signal chain: <audio> → MediaElementSource → AnalyserNode → GainNode → destination
   GainNode is the "auto-level" normalizer (ReplayGain-style approximation).
   We sample the analyser's time-domain data to estimate short-term RMS and
   nudge the GainNode toward a target loudness so loud and quiet tracks play
   at a consistent perceived level. */
function useAudioGraph(audioRef: React.RefObject<HTMLAudioElement | null>) {
  // PERF: single shared AudioContext + MediaElementSource across every
  // component that wants to read this audio element. See
  // src/lib/useSharedAudioGraph.ts for the rationale.
  const graph = useSharedAudioGraph(audioRef);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  analyserRef.current = graph?.analyser ?? null;
  gainRef.current = graph?.gain ?? null;
  ctxRef.current = graph?.ctx ?? null;
  const resume = () => resumeSharedAudio();
  return { analyserRef, gainRef, ctxRef, resume };
}

/* ---------- Auto-level normalizer ----------
   Targets ~-14 LUFS-ish (~0.18 RMS). Smooth gain changes (~0.4s attack/release),
   never boost more than 4x, never duck below 0.25x, hard-limit at output 0.95. */
function useNormalizer({
  enabled, analyserRef, gainRef, ctxRef, trackId,
}: {
  enabled: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
  gainRef: React.RefObject<GainNode | null>;
  ctxRef: React.RefObject<AudioContext | null>;
  trackId: string | null;
}) {
  const rafRef = useRef<number | null>(null);
  const lastGain = useRef(1);

  useEffect(() => {
    // Reset baseline on track change so the next track starts at unity.
    lastGain.current = 1;
    const g = gainRef.current;
    const ctx = ctxRef.current;
    if (g && ctx) g.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
  }, [trackId, gainRef, ctxRef]);

  useEffect(() => {
    const analyser = analyserRef.current;
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !gain || !ctx) return;

    if (!enabled) {
      gain.gain.setTargetAtTime(1, ctx.currentTime, 0.15);
      return;
    }

    const target = 0.18;       // target RMS (≈ -14 LUFS perceived)
    const minGain = 0.25;
    const maxGain = 4.0;
    const buf = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

    const tick = () => {
      analyser.getFloatTimeDomainData(buf as any);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      if (rms > 0.005) {
        let desired = target / rms;
        desired = Math.max(minGain, Math.min(maxGain, desired));
        // Limiter: prevent peak * gain > 0.95
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const a = Math.abs(buf[i]);
          if (a > peak) peak = a;
        }
        if (peak * desired > 0.95) desired = 0.95 / Math.max(peak, 1e-4);
        // Smooth toward desired (slow attack/release)
        lastGain.current = lastGain.current + (desired - lastGain.current) * 0.08;
        gain.gain.setTargetAtTime(lastGain.current, ctx.currentTime, 0.12);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [enabled, analyserRef, gainRef, ctxRef]);
}

/* ---------- Visualizer ---------- */
function LiveVisualizerImpl({
  analyserRef,
  mode,
  isPlaying,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  mode: VisMode;
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const active = useRenderActive(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    // PERF: skip the rAF loop entirely when the canvas isn't visible
    // or the device is in a low-power state.
    if (!active) {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const analyser = analyserRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      tRef.current += isPlaying ? 0.015 : 0.005;

      let data: Uint8Array<ArrayBuffer>;
      if (analyser) {
        data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        analyser.getByteFrequencyData(data);
      } else {
        // idle pulse
        const n = 128;
        data = new Uint8Array(new ArrayBuffer(n));
        for (let i = 0; i < n; i++) {
          data[i] = isPlaying
            ? 60 + Math.sin(tRef.current * 2 + i * 0.18) * 40 + Math.random() * 20
            : 20 + Math.sin(tRef.current + i * 0.12) * 15;
        }
      }

      if (mode === "ring") {
        const bars = 96;
        const radius = Math.min(w, h) * 0.34;
        const step = data.length / bars;
        for (let i = 0; i < bars; i++) {
          const v = data[Math.floor(i * step)] / 255;
          const len = 8 + v * Math.min(w, h) * 0.18;
          const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
          const x1 = cx + Math.cos(a) * radius;
          const y1 = cy + Math.sin(a) * radius;
          const x2 = cx + Math.cos(a) * (radius + len);
          const y2 = cy + Math.sin(a) * (radius + len);
          const hue = 270 + v * 80;
          const grad = ctx2d.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, `hsla(${hue},100%,60%,0.95)`);
          grad.addColorStop(1, `hsla(${hue + 40},100%,55%,0.1)`);
          ctx2d.strokeStyle = grad;
          ctx2d.lineWidth = 3 * dpr;
          ctx2d.lineCap = "round";
          ctx2d.shadowColor = `hsla(${hue},100%,60%,0.9)`;
          ctx2d.shadowBlur = 12 * dpr;
          ctx2d.beginPath();
          ctx2d.moveTo(x1, y1);
          ctx2d.lineTo(x2, y2);
          ctx2d.stroke();
        }
      } else if (mode === "bars") {
        const bars = 64;
        const step = data.length / bars;
        const barW = w / bars;
        for (let i = 0; i < bars; i++) {
          const v = data[Math.floor(i * step)] / 255;
          const bh = v * h * 0.9;
          const grad = ctx2d.createLinearGradient(0, h, 0, h - bh);
          grad.addColorStop(0, "rgba(0,230,255,0.9)");
          grad.addColorStop(0.5, "rgba(197,61,255,0.9)");
          grad.addColorStop(1, "rgba(255,0,166,0.9)");
          ctx2d.fillStyle = grad;
          ctx2d.shadowColor = "rgba(197,61,255,0.7)";
          ctx2d.shadowBlur = 8 * dpr;
          const x = i * barW + barW * 0.15;
          const bw = barW * 0.7;
          ctx2d.fillRect(x, h - bh, bw, bh);
        }
      } else {
        // particles — orbiting glowing dots driven by avg energy
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const energy = sum / data.length / 255;
        const count = 56;
        for (let i = 0; i < count; i++) {
          const a = tRef.current * (i % 2 === 0 ? 1 : -1) + (i / count) * Math.PI * 2;
          const r = Math.min(w, h) * (0.18 + (energy + 0.1) * 0.25) +
            Math.sin(tRef.current * 2 + i) * 14 * dpr;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          const size = (1.6 + energy * 5) * dpr;
          const hue = 220 + (i / count) * 140;
          ctx2d.fillStyle = `hsla(${hue},100%,65%,${0.6 + energy * 0.4})`;
          ctx2d.shadowColor = `hsla(${hue},100%,60%,1)`;
          ctx2d.shadowBlur = 18 * dpr;
          ctx2d.beginPath();
          ctx2d.arc(x, y, size, 0, Math.PI * 2);
          ctx2d.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [analyserRef, mode, isPlaying, active]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

/** Memoized to avoid re-render on every parent state tick. */
const LiveVisualizer = memo(LiveVisualizerImpl);

/* ---------- Listener count (stage_participants realtime) ---------- */
function useLiveListenerCount(streamId: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("stage_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("stream_id", streamId);
      if (!cancelled) setCount(c ?? 0);
    };
    fetchCount();
    const ch = supabase
      .channel(`listeners-${streamId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "stage_participants", filter: `stream_id=eq.${streamId}` },
        fetchCount)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [streamId]);
  return count;
}

/* ---------- Live battle state ---------- */
interface LiveBattle {
  id: string;
  status: string;
  artist_a_name: string | null;
  artist_b_name: string | null;
  a_wins: number;
  b_wins: number;
  current_round: number;
  total_rounds: number;
  active_side: string | null;
}
function useLiveBattle(streamId: string | null) {
  const [battle, setBattle] = useState<LiveBattle | null>(null);
  useEffect(() => {
    if (!streamId) { setBattle(null); return; }
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from("battle_matches")
        .select("id,status,artist_a_name,artist_b_name,a_wins,b_wins,current_round,total_rounds,active_side")
        .eq("stream_id", streamId)
        .eq("status", "live")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setBattle((data as any) ?? null);
    };
    refresh();
    const ch = supabase
      .channel(`battle-${streamId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "battle_matches", filter: `stream_id=eq.${streamId}` },
        refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [streamId]);
  return battle;
}

/* ---------- Like (track_likes) ---------- */
function useTrackLike(trackId: string | null, userId: string | null) {
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    if (!trackId || !userId) { setLiked(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("track_likes")
        .select("track_id")
        .eq("track_id", trackId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setLiked(!!data);
    })();
    return () => { cancelled = true; };
  }, [trackId, userId]);

  const toggle = async () => {
    if (!trackId || !userId) { toast.error("Sign in to like tracks"); return; }
    if (liked) {
      setLiked(false);
      await supabase.from("track_likes").delete().eq("track_id", trackId).eq("user_id", userId);
    } else {
      setLiked(true);
      await supabase.from("track_likes").insert({ track_id: trackId, user_id: userId });
    }
  };
  return [liked, toggle] as const;
}

/* ============================================================
   MAIN IMMERSIVE PLAYER
============================================================ */
export function ImmersivePlayer({
  track,
  upNext,
  leaderboard,
  userId,
  streamId,
  isHost,
}: {
  track: PlayTrack | null;
  upNext: PlayTrack[];
  leaderboard: PlayTrack[];
  userId: string | null;
  streamId: string | null;
  isHost: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { analyserRef, gainRef, ctxRef, resume } = useAudioGraph(audioRef);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [visMode, setVisMode] = useState<VisMode>("ring");
  const [showQueue, setShowQueue] = useState(true);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const sleepRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [normalize, setNormalize] = useState(true);
  useNormalizer({ enabled: normalize, analyserRef, gainRef, ctxRef, trackId: track?.id ?? null });

  const voteFn = useServerFn(votePlayTrack);
  const advanceFn = useServerFn(advancePlayQueue);
  const playFn = useServerFn(playTrackNow);
  const reorderFn = useServerFn(reorderPlayQueue);
  const deleteFn = useServerFn(deletePlayTrack);
  const [myVote] = useMyVote(track?.id ?? null, userId);
  const [liked, toggleLike] = useTrackLike(track?.id ?? null, userId);

  // Host-only local order overlay for the Up Next list (drag-to-reorder).
  // Mirrors `upNext` ids; cleared/synced when server data changes.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  useEffect(() => { setLocalOrder(null); }, [upNext.map(t => t.id).join("|")]);
  const orderedUpNext = useMemo(() => {
    if (!localOrder) return upNext;
    const byId = new Map(upNext.map(t => [t.id, t]));
    const out: PlayTrack[] = [];
    for (const id of localOrder) { const t = byId.get(id); if (t) out.push(t); }
    for (const t of upNext) if (!localOrder.includes(t.id)) out.push(t);
    return out;
  }, [upNext, localOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = async (e: DragEndEvent) => {
    if (!isHost || !streamId) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const current = orderedUpNext.map(t => t.id);
    const from = current.indexOf(String(active.id));
    const to = current.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(current, from, to);
    setLocalOrder(next);
    try {
      await reorderFn({ data: { streamId, orderedTrackIds: next } });
      toast.success("Queue reordered");
    } catch (err: any) {
      setLocalOrder(null);
      toast.error(err?.message ?? "Reorder failed");
    }
  };

  const listeners = useLiveListenerCount(streamId);
  const battle = useLiveBattle(streamId);

  /* ----- audio element binding ----- */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onPlay = () => { setIsPlaying(true); resume(); };
    const onPause = () => setIsPlaying(false);
    const onEnd = async () => {
      setIsPlaying(false);
      if (isHost && streamId) {
        try { await advanceFn({ data: { streamId } }); } catch { /* ignore */ }
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, [track?.id, isHost, streamId, advanceFn, resume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = speed;
  }, [speed]);

  /* ----- sleep timer ----- */
  useEffect(() => {
    if (sleepRef.current) clearTimeout(sleepRef.current);
    if (sleepMin) {
      sleepRef.current = setTimeout(() => {
        audioRef.current?.pause();
        toast.message("Sleep timer reached — paused");
        setSleepMin(null);
      }, sleepMin * 60_000);
    }
    return () => { if (sleepRef.current) clearTimeout(sleepRef.current); };
  }, [sleepMin]);

  /* ----- actions ----- */
  const togglePlay = async () => {
    // If nothing is playing yet, the host can promote the first queued track.
    if (!track) {
      if (!isHost || !streamId) {
        toast.message("Waiting for the host to start the next track…");
        return;
      }
      const next = upNext[0];
      if (!next) { toast.error("Queue is empty — submit a track to start."); return; }
      try {
        await playFn({ data: { streamId, trackId: next.id } });
        toast.success(`Now playing: ${next.title}`);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to start track");
      }
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const seek = (pct: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = pct * duration;
    setProgress(a.currentTime);
  };
  const vote = async (v: 1 | -1) => {
    if (!track) return;
    if (!userId) { toast.error("Sign in to vote"); return; }
    const next = myVote === v ? 0 : v;
    try { await voteFn({ data: { trackId: track.id, value: next as any } }); }
    catch (e: any) { toast.error(e?.message ?? "Vote failed"); }
  };
  const hostSkip = async () => {
    if (!isHost || !streamId) return;
    try { await advanceFn({ data: { streamId } }); toast.success("Skipped"); }
    catch (e: any) { toast.error(e?.message ?? "Skip failed"); }
  };
  const hostPlayPrev = async () => {
    if (!isHost || !streamId) return;
    const prev = leaderboard[0];
    if (!prev) { toast.error("No previous track"); return; }
    try { await playFn({ data: { streamId, trackId: prev.id } }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = track ? `🔥 Listening to "${track.title}" by ${track.artist_name} on BWFPLAY` : "BWFPLAY Live";
    if (navigator.share) {
      try { await navigator.share({ title: "BWFPLAY", text, url }); return; } catch { /* user cancel */ }
    }
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };

  const totalLikes = useMemo(
    () => [track, ...upNext, ...leaderboard].filter(Boolean).reduce((acc, t) => acc + (t!.like_count ?? 0), 0),
    [track, upNext, leaderboard],
  );
  const totalVotes = useMemo(
    () => [track, ...upNext, ...leaderboard].filter(Boolean).reduce((acc, t) => acc + (t!.like_count ?? 0) + (t!.dislike_count ?? 0), 0),
    [track, upNext, leaderboard],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* ───────── HERO PLAYER ───────── */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(197,61,255,0.18),transparent_60%),radial-gradient(120%_120%_at_80%_100%,rgba(0,230,255,0.14),transparent_55%),#06060f] p-5 sm:p-8 backdrop-blur-xl shadow-[0_0_120px_-40px_rgba(197,61,255,0.55)]">
        {/* glow corners */}
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#C53DFF]/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-[#00E6FF]/25 blur-3xl" />

        {/* Top bar — LIVE + listener count + vis mode */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF00A6] to-[#C53DFF] px-2.5 py-1 text-[10px] font-black tracking-[0.18em]">
              <Radio className="h-3 w-3" /> LIVE
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-white/70">
              <Users className="h-3.5 w-3.5 text-[#00E6FF]" /> {listeners.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-0.5">
            {(["ring","bars","particles"] as VisMode[]).map((m) => (
              <button key={m}
                onClick={() => setVisMode(m)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                  visMode === m
                    ? "bg-gradient-to-r from-[#C53DFF] to-[#004BFF] text-white shadow-[0_0_15px_rgba(197,61,255,0.6)]"
                    : "text-white/50 hover:text-white"
                }`}
              >{m}</button>
            ))}
          </div>
        </div>

        {/* Artwork + visualizer */}
        <div className="relative z-10 mx-auto flex w-full max-w-[420px] items-center justify-center">
          <div className="relative aspect-square w-full">
            <LiveVisualizer analyserRef={analyserRef} mode={visMode} isPlaying={isPlaying} />
            <div className={`absolute inset-[18%] overflow-hidden rounded-3xl border-2 border-white/15 shadow-[0_0_80px_-10px_rgba(197,61,255,0.7)] transition-transform duration-500 ${
              isPlaying ? "scale-100" : "scale-95"
            }`}>
              {track?.cover_url ? (
                <SignedImg src={track.cover_url} alt={track.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#C53DFF] to-[#004BFF]">
                  <Sparkles className="h-16 w-16 text-white/60" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Track info + verified + like/share/playlist */}
        <div className="relative z-10 mt-5 flex flex-col items-center text-center">
          {track ? (
            <>
              <h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-black tracking-tight">
                <span className="truncate max-w-[80vw] sm:max-w-md">{track.title}</span>
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
                <span className="truncate">{track.artist_name}</span>
                <BadgeCheck className="h-4 w-4 text-[#00E6FF]" />
                <RankBadge userId={track.artist_user_id} size="md" />
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={toggleLike}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    liked
                      ? "border-[#FF00A6] bg-[#FF00A6]/15 text-[#FF00A6] shadow-[0_0_20px_-5px_rgba(255,0,166,0.7)]"
                      : "border-white/15 text-white/80 hover:border-white/40"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> Like
                </button>
                <button
                  onClick={share}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:border-white/40 transition"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
                <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1.5 text-xs font-bold text-white/80">
                  <span className="text-[#00E6FF]">{track.score}</span>
                  <span className="text-white/40">score</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white/70">Waiting for next drop…</h2>
              <p className="mt-1 text-sm text-white/40">{isHost ? "Pick a track from the queue to start." : "The host will play the next track soon."}</p>
            </>
          )}
        </div>

        {/* Audio element */}
        {track?.audio_url && (
          <audio
            key={track.id}
            ref={audioRef}
            src={track.audio_url}
            autoPlay
            crossOrigin="anonymous"
            className="hidden"
          />
        )}

        {/* Progress + transport */}
        <div className="relative z-10 mt-6 w-full">
          {/* Progress */}
          <div className="flex items-center gap-3 text-[11px] tabular-nums text-white/60">
            <span className="w-10 text-right">{fmt(progress)}</span>
            <button
              type="button"
              className="group relative h-2 flex-1 rounded-full bg-white/10 overflow-hidden"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seek((e.clientX - r.left) / r.width);
              }}
              aria-label="Seek"
            >
              <div
                className="h-full bg-gradient-to-r from-[#00E6FF] via-[#C53DFF] to-[#FF00A6] shadow-[0_0_10px_rgba(197,61,255,0.8)] transition-all"
                style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
              />
            </button>
            <span className="w-10">{fmt(duration)}</span>
          </div>

          {/* Vote ribbon (live score visible always) */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => vote(1)}
              className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                myVote === 1
                  ? "border-emerald-400 bg-emerald-400/15 text-emerald-300 shadow-[0_0_18px_-5px_rgba(52,211,153,0.7)]"
                  : "border-emerald-400/30 text-emerald-300/80 hover:border-emerald-400"
              }`}
            >▲ Hype</button>
            <button
              onClick={() => vote(-1)}
              className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                myVote === -1
                  ? "border-rose-400 bg-rose-400/15 text-rose-300 shadow-[0_0_18px_-5px_rgba(251,113,133,0.7)]"
                  : "border-rose-400/30 text-rose-300/80 hover:border-rose-400"
              }`}
            >▼ Pass</button>
          </div>

          {/* Transport */}
          <div className="mt-5 flex items-center justify-center gap-3 sm:gap-5">
            <button
              aria-label="Previous"
              onClick={hostPlayPrev}
              disabled={!isHost}
              className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:text-white transition disabled:opacity-30"
              title={isHost ? "Replay last" : "Host only"}
            ><SkipBack className="h-5 w-5" /></button>

            <button
              aria-label="Shuffle"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition"
              onClick={() => toast.message("Shuffle is host-controlled in BWFPLAY")}
            ><Shuffle className="h-4 w-4" /></button>

            <button
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
              disabled={!track?.audio_url && !(isHost && upNext.length > 0)}
              className="relative grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-gradient-to-br from-[#C53DFF] via-[#FF00A6] to-[#004BFF] text-white shadow-[0_0_60px_-5px_rgba(197,61,255,0.85)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-0.5" />}
            </button>

            <button
              aria-label="Repeat"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition"
              onClick={() => toast.message("Loop is host-controlled in BWFPLAY")}
            ><Repeat className="h-4 w-4" /></button>

            <button
              aria-label="Skip"
              onClick={hostSkip}
              disabled={!isHost}
              className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:text-white transition disabled:opacity-30"
              title={isHost ? "Skip to next" : "Host only"}
            ><SkipForward className="h-5 w-5" /></button>
          </div>

          {/* Secondary row: volume · speed · sleep */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-white/70">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
              <button onClick={() => setMuted(m => !m)} aria-label="Mute">
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={(e) => { setMuted(false); setVolume(parseFloat(e.target.value)); }}
                className="h-1 w-24 accent-[#C53DFF]"
                aria-label="Volume"
              />
            </div>
            <label className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
              <Gauge className="h-3.5 w-3.5" />
              <select
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="bg-transparent text-xs font-bold outline-none"
                aria-label="Playback speed"
              >
                {[0.75, 1, 1.25, 1.5, 2].map(s => (
                  <option key={s} value={s} className="bg-black">{s}×</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
              <Moon className="h-3.5 w-3.5" />
              <select
                value={sleepMin ?? ""}
                onChange={(e) => setSleepMin(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="bg-transparent text-xs font-bold outline-none"
                aria-label="Sleep timer"
              >
                <option value="" className="bg-black">Sleep</option>
                {[5, 15, 30, 45, 60].map(m => (
                  <option key={m} value={m} className="bg-black">{m}m</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setNormalize(v => !v)}
              title="Auto-level: keeps loud and quiet tracks at a consistent volume"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                normalize
                  ? "border-[#00E6FF]/60 bg-[#00E6FF]/10 text-[#00E6FF] shadow-[0_0_15px_-5px_rgba(0,230,255,0.7)]"
                  : "border-white/10 bg-black/30 text-white/60 hover:text-white"
              }`}
              aria-pressed={normalize}
              aria-label="Toggle auto-level normalization"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AUTO-LEVEL {normalize ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* COMMUNITY STRIP */}
        <div className="relative z-10 mt-7 grid grid-cols-3 gap-3">
          <Stat icon={<Users className="h-4 w-4 text-[#00E6FF]" />} label="Listeners" value={listeners.toLocaleString()} />
          <Stat icon={<Heart className="h-4 w-4 text-[#FF00A6]" />} label="Likes" value={totalLikes.toLocaleString()} />
          <Stat icon={<MessageCircle className="h-4 w-4 text-[#C53DFF]" />} label="Votes" value={totalVotes.toLocaleString()} />
        </div>
      </div>

      {/* ───────── RIGHT COLUMN ───────── */}
      <div className="space-y-4">
        {/* Battle status */}
        {battle && (
          <div className="overflow-hidden rounded-2xl border border-[#FF00A6]/40 bg-gradient-to-br from-[#FF00A6]/15 via-[#C53DFF]/10 to-[#004BFF]/15 p-4 shadow-[0_0_40px_-15px_rgba(255,0,166,0.6)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.2em] text-[#FF00A6]">
                <Trophy className="h-3 w-3" /> LIVE BATTLE · ROUND {battle.current_round}/{battle.total_rounds}
              </span>
              <span className="text-[10px] font-bold text-white/60">{(battle.status ?? "live").toUpperCase()}</span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <BattleSide name={battle.artist_a_name ?? "Artist A"} wins={battle.a_wins} active={battle.active_side === "a"} side="a" />
              <span className="text-xs font-black text-white/40">VS</span>
              <BattleSide name={battle.artist_b_name ?? "Artist B"} wins={battle.b_wins} active={battle.active_side === "b"} side="b" />
            </div>
          </div>
        )}

        {/* Up Next */}
        <div className="rounded-2xl border border-white/10 bg-[#08081a]/80 p-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setShowQueue(v => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="inline-flex items-center gap-2 text-xs font-black tracking-wider">
              <ListMusic className="h-4 w-4 text-[#C53DFF]" /> UP NEXT
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">{upNext.length}</span>
            </span>
            {showQueue ? <ChevronDown className="h-4 w-4 text-white/50" /> : <ChevronUp className="h-4 w-4 text-white/50" />}
          </button>
          {showQueue && (
            orderedUpNext.length === 0 ? (
              <p className="mt-4 text-center text-sm text-white/40">Queue is empty — be first to submit.</p>
            ) : (
              <>
                {isHost && (
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-white/40">
                    Drag to reorder · host only
                  </p>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={orderedUpNext.slice(0, 8).map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <ul className="mt-3 space-y-1.5">
                      {orderedUpNext.slice(0, 8).map((t, i) => (
                        <QueueItem
                          key={t.id}
                          track={t}
                          index={i}
                          isHost={isHost}
                          onPlayNow={async () => {
                            if (!streamId) return;
                            try { await playFn({ data: { streamId, trackId: t.id } }); toast.success("Playing now"); }
                            catch (e: any) { toast.error(e?.message ?? "Failed"); }
                          }}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </>
            )
          )}
        </div>

        {/* Leaderboard mini */}
        <div className="rounded-2xl border border-white/10 bg-[#08081a]/80 p-4 backdrop-blur">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-black tracking-wider">
            <Trophy className="h-4 w-4 text-[#FFD24A]" /> LEADERBOARD
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-center text-sm text-white/40">No tracks played yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {leaderboard.map((t, i) => (
                <li key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-5 text-center font-black ${
                    i === 0 ? "text-[#FFD24A]" : i === 1 ? "text-white/70" : i === 2 ? "text-amber-700" : "text-white/40"
                  }`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{t.title}</div>
                    <div className="flex items-center gap-1 text-[10px] text-white/50">
                      <span className="truncate">{t.artist_name}</span>
                      <RankBadge userId={t.artist_user_id} size="xs" />
                    </div>
                  </div>
                  <span className="font-black text-[#C53DFF]">{t.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

function QueueItem({
  track, index, isHost, onPlayNow,
}: {
  track: PlayTrack;
  index: number;
  isHost: boolean;
  onPlayNow: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id, disabled: !isHost });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group flex items-center gap-2.5 rounded-xl p-2 transition ${
        track.boosted ? "border border-[#FF00A6]/40 bg-[#FF00A6]/5" : "border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
      } ${isDragging ? "ring-1 ring-[#C53DFF]" : ""}`}
    >
      {isHost ? (
        <button
          {...listeners}
          type="button"
          className="grid h-6 w-5 cursor-grab place-items-center text-white/40 hover:text-white active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="w-5 text-center text-[11px] font-black text-white/40">{index + 1}</span>
      )}
      <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#C53DFF] to-[#004BFF]">
        {track.cover_url && <SignedImg src={track.cover_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate text-xs font-semibold">
          {track.boosted && <Zap className="h-3 w-3 flex-shrink-0 text-[#FF00A6]" />}
          <span className="truncate">{track.title}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/50">
          <span className="truncate">{track.artist_name}</span>
          <RankBadge userId={track.artist_user_id} size="xs" />
        </div>
      </div>
      {isHost && (
        <button
          onClick={onPlayNow}
          className="rounded-full bg-white/10 p-1.5 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-white/20"
          aria-label="Play now"
        >
          <Play className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}

function BattleSide({ name, wins, active, side }: { name: string; wins: number; active: boolean; side: "a"|"b" }) {
  return (
    <div className={`rounded-xl border p-2.5 text-center transition ${
      active
        ? "border-[#FF00A6] bg-[#FF00A6]/10 shadow-[0_0_25px_-5px_rgba(255,0,166,0.7)]"
        : "border-white/10 bg-black/30"
    }`}>
      <div className={`text-[9px] font-black tracking-widest ${side === "a" ? "text-[#00E6FF]" : "text-[#FF00A6]"}`}>SIDE {side.toUpperCase()}</div>
      <div className="mt-0.5 truncate text-xs font-bold">{name}</div>
      <div className="mt-1 text-lg font-black tabular-nums">{wins}</div>
      <div className="text-[9px] text-white/40">wins</div>
    </div>
  );
}