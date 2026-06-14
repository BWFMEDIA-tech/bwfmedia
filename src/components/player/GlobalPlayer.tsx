import { Heart, ListMusic, Mic2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlayer, type PlayerTrack } from "@/lib/player-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function fmt(sec: number) {
  if (!isFinite(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GlobalPlayer() {
  const p = usePlayer();
  const track = p.track;
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const queueRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !track) { setLiked(false); return; }
    let cancelled = false;
    (supabase as any)
      .from("track_likes")
      .select("track_id")
      .eq("user_id", userId)
      .eq("track_id", track.id)
      .maybeSingle()
      .then(({ data }: any) => { if (!cancelled) setLiked(!!data); });
    return () => { cancelled = true; };
  }, [userId, track?.id]);

  useEffect(() => {
    if (!queueOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(e.target as Node)) setQueueOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [queueOpen]);

  const toggleLike = async () => {
    if (!track) return;
    if (!userId) { toast.error("Sign in to like tracks"); return; }
    if (liked) {
      setLiked(false);
      const { error } = await (supabase as any).from("track_likes")
        .delete().eq("user_id", userId).eq("track_id", track.id);
      if (error) { setLiked(true); toast.error("Couldn't unlike"); }
    } else {
      setLiked(true);
      const { error } = await (supabase as any).from("track_likes")
        .insert({ user_id: userId, track_id: track.id });
      if (error) { setLiked(false); toast.error("Couldn't like"); }
    }
  };

  const playFromQueue = (t: PlayerTrack) => { p.play(t, p.queue); };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl">
      {queueOpen && (
        <div
          ref={queueRef}
          className="absolute bottom-full right-4 mb-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-[#0a0a0a]/98 p-3 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Up Next ({p.queue.length})</h3>
            <button onClick={() => setQueueOpen(false)} className="text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          {p.queue.length === 0 ? (
            <p className="text-xs text-white/40 py-4 text-center">Queue is empty</p>
          ) : (
            <ul className="space-y-1">
              {p.queue.map((t, i) => {
                const isCurrent = t.id === track?.id;
                return (
                  <li key={`${t.id}-${i}`}>
                    <button
                      onClick={() => playFromQueue(t)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${isCurrent ? "bg-red-600/20 text-red-400" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                    >
                      <span className="w-4 text-white/30 tabular-nums">{i + 1}</span>
                      <span className="flex-1 truncate">
                        <span className="block truncate font-medium">{t.title}</span>
                        <span className="block truncate text-white/40">{t.artist}</span>
                      </span>
                      {isCurrent && p.isPlaying && <span className="text-red-500">▶</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-white/5">
            {track?.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-white/30"><Mic2 className="h-5 w-5" /></div>}
          </div>
          <div className="min-w-0 block">
            <div className="truncate text-sm font-semibold text-white">{track?.title ?? "Nothing playing"}</div>
            <div className="truncate text-xs text-white/50">{track?.artist ?? "Pick a track from your library"}</div>
          </div>
          <button
            onClick={toggleLike}
            disabled={!track}
            aria-label={liked ? "Unlike" : "Like"}
            className={`ml-2 transition-colors disabled:opacity-30 ${liked ? "text-red-500" : "text-white/40 hover:text-red-500"}`}
          >
            <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-[2]">
          <div className="flex items-center gap-3">
            <button onClick={p.toggleShuffle} aria-label="Shuffle" className={`${p.shuffle ? "text-red-500" : "text-white/50 hover:text-white"}`}><Shuffle className="h-4 w-4" /></button>
            <button onClick={p.prev} className="text-white/70 hover:text-white"><SkipBack className="h-5 w-5" /></button>
            <button onClick={p.toggle} className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white hover:bg-red-500" disabled={!track}>
              {p.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>
            <button onClick={p.next} className="text-white/70 hover:text-white"><SkipForward className="h-5 w-5" /></button>
            <button onClick={p.cycleRepeat} aria-label="Repeat" className={`${p.repeat !== "off" ? "text-red-500" : "text-white/50 hover:text-white"}`}>
              {p.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex w-full max-w-xl items-center gap-2 text-[10px] text-white/50">
            <span className="w-8 text-right tabular-nums">{fmt(p.progress)}</span>
            <input type="range" min={0} max={p.duration || 0} value={p.progress} onChange={(e) => p.seek(Number(e.target.value))} className="h-1 flex-1 cursor-pointer accent-red-600" />
            <span className="w-8 tabular-nums">{fmt(p.duration)}</span>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
          <Volume2 className="h-4 w-4 text-white/50" />
          <input type="range" min={0} max={1} step={0.01} value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} className="h-1 w-24 cursor-pointer accent-red-600" />
          <button
            onClick={() => setQueueOpen((v) => !v)}
            aria-label="Queue"
            className={`transition-colors ${queueOpen ? "text-red-500" : "text-white/40 hover:text-white"}`}
          >
            <ListMusic className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}