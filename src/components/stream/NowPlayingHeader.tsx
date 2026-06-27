import { useEffect, useRef, useState } from "react";
import { Music, Play, Pause, Radio, Disc3, Swords, Volume2, Mic, Clock, Trophy, SkipForward } from "lucide-react";
import { usePlayQueue } from "@/lib/usePlayQueue";
import { supabase } from "@/integrations/supabase/client";
import { RankBadge } from "@/components/rank/RankBadge";
import { SignedImg } from "@/components/ui/signed-img";
import { useServerFn } from "@tanstack/react-start";
import { advancePlayQueue } from "@/lib/play.functions";
import { toast } from "sonner";

type Mode = "live" | "upload" | "battle-live" | "battle-pending" | "idle";

interface ActiveBattle {
  id: string;
  status: string;
  artist_a_id: string | null;
  artist_b_id: string | null;
  total_rounds: number | null;
}

interface ActiveRound {
  id: string;
  round_number: number;
  status: string;
  ends_at: string | null;
}

interface LiveParticipant {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

/**
 * Global persistent "Now Playing" master header for Play Arena.
 * Single source of truth — one room, one active audio spotlight.
 *
 * Sits ABOVE artist tiles / stage grid. Mirrors:
 *  - Uploaded track currently spinning (play_tracks.status = 'playing')
 *  - Live performer (first on-stage participant if no track)
 *  - Battle round track (when a battle round is live)
 */
export function NowPlayingHeader({
  streamId,
  liveParticipants = [],
  isHost = false,
}: {
  streamId: string | null;
  liveParticipants?: LiveParticipant[];
  isHost?: boolean;
}) {
  const { playing } = usePlayQueue(streamId);
  const [battle, setBattle] = useState<ActiveBattle | null>(null);
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Subscribe to active battle for this stream
  useEffect(() => {
    if (!streamId) { setBattle(null); return; }
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from("battle_matches")
        .select("id, status, artist_a_id, artist_b_id, total_rounds")
        .eq("stream_id", streamId)
        .in("status", ["pending", "live"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setBattle((data as ActiveBattle | null) ?? null);
    };
    refresh();
    const ch = supabase
      .channel(`np-battle-${streamId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_matches", filter: `stream_id=eq.${streamId}` }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [streamId]);

  // Subscribe to the current/most recent round of the active battle
  useEffect(() => {
    if (!battle?.id) { setRound(null); return; }
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from("battle_rounds")
        .select("id, round_number, status, ends_at")
        .eq("match_id", battle.id)
        .order("round_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setRound((data as ActiveRound | null) ?? null);
    };
    refresh();
    const ch = supabase
      .channel(`np-round-${battle.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_rounds", filter: `match_id=eq.${battle.id}` }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [battle?.id]);

  // Countdown ticker (only runs when a round is live with an end time)
  useEffect(() => {
    if (!round || round.status !== "live" || !round.ends_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [round?.id, round?.status, round?.ends_at]);

  useEffect(() => { setIsPlaying(false); setProgress(0); setDuration(0); }, [playing?.id]);

  // Auto-play when a new track becomes the playing track. Browsers may reject
  // autoplay without prior gesture — that's fine, the user can press Play.
  useEffect(() => {
    if (!playing?.audio_url) return;
    const a = audioRef.current;
    if (!a) return;
    const tryPlay = async () => {
      try {
        await a.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    };
    void tryPlay();
  }, [playing?.id, playing?.audio_url]);

  // Resolve mode + display data (single source of truth resolver)
  const livePerformer = liveParticipants[0] ?? null;
  const inBattle = battle?.status === "live";
  const roundLive = inBattle && round?.status === "live";
  const mode: Mode = roundLive
    ? "battle-live"
    : inBattle
      ? "battle-pending"
      : playing
        ? "upload"
        : livePerformer
          ? "live"
          : "idle";

  const title =
    playing?.title ??
    (mode === "battle-live" ? `Round ${round?.round_number ?? "?"} — Battle In Progress`
    : mode === "battle-pending" ? `Battle Ready — Awaiting Round ${(round?.round_number ?? 0) + (round?.status === "ended" ? 1 : 0) || 1}`
    : mode === "live" ? "Live Performance"
    : "Waiting for the spotlight…");
  const artistName = playing?.artist_name ?? livePerformer?.display_name ?? "—";
  const coverUrl = playing?.cover_url ?? livePerformer?.avatar_url ?? null;

  const badge =
    mode === "battle-live"    ? { label: "Battle Round Track", icon: Swords, cls: "from-pink-500 to-red-500",     ring: "ring-red-500/60",     glow: "shadow-[0_0_30px_-4px_rgba(244,63,94,0.7)]" } :
    mode === "battle-pending" ? { label: "Battle Standby",     icon: Trophy, cls: "from-amber-500 to-pink-500",   ring: "ring-amber-400/50",   glow: "shadow-[0_0_24px_-6px_rgba(245,158,11,0.6)]" } :
    mode === "upload"         ? { label: "Uploaded Track",     icon: Disc3,  cls: "from-violet-500 to-blue-500",  ring: "ring-violet-400/50",  glow: "shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)]" } :
    mode === "live"           ? { label: "Live Performance",   icon: Mic,    cls: "from-emerald-500 to-cyan-500", ring: "ring-emerald-400/60", glow: "shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]" } :
                                { label: "Idle",               icon: Volume2,cls: "from-zinc-600 to-zinc-700",    ring: "ring-white/10",       glow: "" };
  const BadgeIcon = badge.icon;

  const secondsLeft = roundLive && round?.ends_at
    ? Math.max(0, Math.floor((new Date(round.ends_at).getTime() - now) / 1000))
    : null;
  const mmss = secondsLeft != null
    ? `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`
    : null;

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) { await a.play(); setIsPlaying(true); }
      else { a.pause(); setIsPlaying(false); }
    } catch { /* autoplay rejection */ }
  };

  const advanceFn = useServerFn(advancePlayQueue);
  const handleNext = async () => {
    if (!streamId || !isHost) return;
    try {
      const r = await advanceFn({ data: { streamId } });
      toast.success(r.next ? "Playing next song" : "Queue empty");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to advance queue");
    }
  };

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className={`sticky top-2 z-30 overflow-hidden rounded-2xl border bg-gradient-to-r from-[#0a0a14]/95 via-[#0d0d1a]/95 to-[#0a0a14]/95 p-3 backdrop-blur-xl sm:p-4 ${
      mode === "battle-live" ? "border-red-500/50 shadow-[0_8px_40px_-12px_rgba(244,63,94,0.6)]"
      : mode === "battle-pending" ? "border-amber-500/40 shadow-[0_8px_40px_-12px_rgba(245,158,11,0.5)]"
      : mode === "live" ? "border-emerald-500/40 shadow-[0_8px_40px_-12px_rgba(16,185,129,0.5)]"
      : "border-violet-500/30 shadow-[0_8px_40px_-12px_rgba(139,92,246,0.5)]"
    }`}>
      {/* Top mode banner */}
      <div className={`-mx-3 -mt-3 mb-3 flex items-center justify-between gap-2 bg-gradient-to-r ${badge.cls} px-3 py-1.5 sm:-mx-4 sm:-mt-4 sm:mb-3 sm:px-4`}>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">
          <BadgeIcon className="h-3.5 w-3.5" />
          {badge.label}
          {mode === "battle-live" && round && (
            <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold tracking-wider">
              ROUND {round.round_number}{battle?.total_rounds ? ` / ${battle.total_rounds}` : ""}
            </span>
          )}
          {mode === "battle-pending" && battle?.total_rounds && (
            <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold tracking-wider">
              BEST OF {battle.total_rounds}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-white/95">
          {mode === "battle-live" && mmss && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 tracking-wider">
              <Clock className="h-3 w-3" /> {mmss}
            </span>
          )}
          {mode === "live" && (
            isHost ? (
              <button
                onClick={handleNext}
                title="Play next song"
                className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-0.5 tracking-wider transition hover:bg-white/20 active:scale-95"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> ON AIR
                <SkipForward className="h-3 w-3" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 tracking-wider">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> ON AIR
              </span>
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Artwork */}
        <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ${badge.ring} bg-gradient-to-br ${badge.cls} ${badge.glow} sm:h-20 sm:w-20`}>
          {coverUrl ? (
            <SignedImg src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-7 w-7 text-white/60" />
            </div>
          )}
          {mode !== "idle" && (
            <span className="absolute inset-0 rounded-xl ring-2 ring-white/20 animate-pulse" />
          )}
        </div>

        {/* Meta */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white sm:text-base">{title}</div>
          <div className="flex items-center gap-1.5 text-xs text-white/60 sm:text-sm">
            <span className="truncate">{artistName}</span>
            <RankBadge userId={playing?.artist_user_id ?? livePerformer?.user_id ?? null} size="sm" />
          </div>

          {/* Progress */}
          {playing?.audio_url && duration > 0 && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full bg-gradient-to-r ${badge.cls} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* Play control (only when track audio available) */}
        {playing?.audio_url && (
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${badge.cls} text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.7)] hover:opacity-90 sm:h-12 sm:w-12`}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
          </button>
        )}
      </div>

      {playing?.audio_url && (
        <audio
          key={playing.id}
          ref={audioRef}
          src={playing.audio_url}
          autoPlay
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          className="hidden"
        />
      )}
    </div>
  );
}