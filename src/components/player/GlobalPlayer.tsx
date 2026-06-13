import { Heart, ListMusic, Mic2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { usePlayer } from "@/lib/player-context";

function fmt(sec: number) {
  if (!isFinite(sec) || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GlobalPlayer() {
  const p = usePlayer();
  const track = p.track;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-white/5">
            {track?.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-white/30"><Mic2 className="h-5 w-5" /></div>}
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="truncate text-sm font-semibold text-white">{track?.title ?? "Nothing playing"}</div>
            <div className="truncate text-xs text-white/50">{track?.artist ?? "Pick a track from your library"}</div>
          </div>
          <button className="ml-2 hidden text-white/40 hover:text-red-500 md:block"><Heart className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-[2]">
          <div className="flex items-center gap-3">
            <button onClick={p.toggleShuffle} className={`hidden sm:block ${p.shuffle ? "text-red-500" : "text-white/50 hover:text-white"}`}><Shuffle className="h-4 w-4" /></button>
            <button onClick={p.prev} className="text-white/70 hover:text-white"><SkipBack className="h-5 w-5" /></button>
            <button onClick={p.toggle} className="grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white hover:bg-red-500" disabled={!track}>
              {p.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>
            <button onClick={p.next} className="text-white/70 hover:text-white"><SkipForward className="h-5 w-5" /></button>
            <button onClick={p.cycleRepeat} className={`hidden sm:block ${p.repeat !== "off" ? "text-red-500" : "text-white/50 hover:text-white"}`}>
              {p.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>
          <div className="hidden w-full max-w-xl items-center gap-2 text-[10px] text-white/50 md:flex">
            <span className="w-8 text-right tabular-nums">{fmt(p.progress)}</span>
            <input type="range" min={0} max={p.duration || 0} value={p.progress} onChange={(e) => p.seek(Number(e.target.value))} className="h-1 flex-1 cursor-pointer accent-red-600" />
            <span className="w-8 tabular-nums">{fmt(p.duration)}</span>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-3 md:flex">
          <Volume2 className="h-4 w-4 text-white/50" />
          <input type="range" min={0} max={1} step={0.01} value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} className="h-1 w-24 cursor-pointer accent-red-600" />
          <button className="text-white/40 hover:text-white"><ListMusic className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}