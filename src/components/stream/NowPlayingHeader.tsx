import { useEffect, useRef, useState } from "react";
import { Music, Play, Pause, Radio, Disc3, Swords, Volume2 } from "lucide-react";
import { usePlayQueue } from "@/lib/usePlayQueue";
import { supabase } from "@/integrations/supabase/client";

type Mode = "live" | "upload" | "battle" | "idle";

interface ActiveBattle {
  id: string;
  status: string;
  artist_a_id: string | null;
  artist_b_id: string | null;
}

interface LiveParticipant {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
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
}: {
  streamId: string | null;
  liveParticipants?: LiveParticipant[];
}) {
  const { playing } = usePlayQueue(streamId);
  const [battle, setBattle] = useState<ActiveBattle | null>(null);
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
        .select("id, status, artist_a_id, artist_b_id")
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

  useEffect(() => { setIsPlaying(false); setProgress(0); setDuration(0); }, [playing?.id]);

  // Resolve mode + display data (single source of truth resolver)
  const livePerformer = liveParticipants[0] ?? null;
  const mode: Mode = battle?.status === "live"
    ? "battle"
    : playing
      ? "upload"
      : livePerformer
        ? "live"
        : "idle";

  const title = playing?.title ?? (mode === "live" ? "Live Performance" : mode === "battle" ? "Battle Round In Progress" : "Waiting for the spotlight…");
  const artistName = playing?.artist_name ?? livePerformer?.display_name ?? "—";
  const coverUrl = playing?.cover_url ?? livePerformer?.avatar_url ?? null;

  const badge =
    mode === "battle" ? { label: "Battle Round Track", icon: Swords, cls: "from-pink-500 to-red-500" } :
    mode === "upload" ? { label: "Uploaded Track", icon: Disc3, cls: "from-violet-500 to-blue-500" } :
    mode === "live"   ? { label: "Live Performance", icon: Radio, cls: "from-emerald-500 to-cyan-500" } :
                        { label: "Idle", icon: Volume2, cls: "from-zinc-600 to-zinc-700" };
  const BadgeIcon = badge.icon;

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) { await a.play(); setIsPlaying(true); }
      else { a.pause(); setIsPlaying(false); }
    } catch { /* autoplay rejection */ }
  };

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="sticky top-2 z-30 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-[#0a0a14]/95 via-[#0d0d1a]/95 to-[#0a0a14]/95 p-3 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(139,92,246,0.5)] sm:p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Artwork */}
        <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${badge.cls} sm:h-20 sm:w-20`}>
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
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
          <div className="mb-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${badge.cls} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow`}>
              <BadgeIcon className="h-3 w-3" />
              {badge.label}
            </span>
            {mode === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> LIVE
              </span>
            )}
          </div>
          <div className="truncate text-sm font-bold text-white sm:text-base">{title}</div>
          <div className="truncate text-xs text-white/60 sm:text-sm">{artistName}</div>

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