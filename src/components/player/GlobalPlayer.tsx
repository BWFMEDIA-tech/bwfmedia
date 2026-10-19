import { Heart, ListMusic, Mic2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlayer } from "@/lib/player-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { getMyTrackLikes, toggleTrackLike } from "@/lib/track-likes.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SignedImg } from "@/components/ui/signed-img";
import { Button } from "@/components/ui/button";
import { MusicDetails, formatPlayerTime } from "./MusicDetails";

export function GlobalPlayer({ hidden = false }: { hidden?: boolean }) {
  const p = usePlayer();
  const auth = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const track = p.track;
  const likes = useQuery({ queryKey: ["my-track-likes", track ? [track.id] : []], queryFn: () => getMyTrackLikes({ data: { trackIds: track ? [track.id] : [] } }), enabled: !!auth.user && !!track });
  const liked = !!track && (likes.data?.liked.includes(track.id) ?? false);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-music-player", !!track && !hidden);
    return () => document.documentElement.removeAttribute("data-music-player");
  }, [!!track, hidden]);
  const toggleLike = async () => {
    if (!track || saving) return;
    if (!auth.user) { toast.error("Sign in to save music"); return; }
    setSaving(true);
    try { await toggleTrackLike({ data: { trackId: track.id } }); await qc.invalidateQueries({ queryKey: ["my-track-likes"] }); qc.invalidateQueries({ queryKey: ["artist-meta"] }); }
    catch { toast.error("Couldn't save this track"); }
    finally { setSaving(false); }
  };
  if (hidden) return null;
  return <>
    {p.detailTrack && <MusicDetails key={p.detailTrack.id} nowPlaying={false} onClose={p.closeDetails} />}
    {expanded && track && <MusicDetails nowPlaying onClose={() => setExpanded(false)} />}
    {track && <section aria-label="Music player" className="music-mini-player fixed inset-x-2 z-40 overflow-hidden rounded-lg border border-brand-silver/25 bg-card/95 text-foreground backdrop-blur-xl md:inset-x-4">
      <input aria-label="Mini player seek" type="range" min={0} max={p.duration || 1} step={0.1} value={Math.min(p.progress, p.duration || 1)} disabled={!p.duration} onChange={(e) => p.seek(Number(e.target.value))} style={{ background: `linear-gradient(to right, var(--primary) ${p.duration ? (Math.min(p.progress, p.duration) / p.duration) * 100 : 0}%, color-mix(in oklab, var(--muted-foreground) 30%, transparent) 0)` }} className="music-mini-progress absolute inset-x-0 top-0 w-full accent-primary" />
      <div className="grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,1fr)_minmax(0,1fr)] md:gap-6 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" aria-label={`Open Now Playing: ${track.title}`} onClick={() => setExpanded(true)} className="h-auto min-w-0 flex-1 justify-start gap-3 px-0 text-left hover:bg-transparent">
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded bg-secondary">{track.coverUrl ? <SignedImg src={track.coverUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center"><Mic2 className="text-muted-foreground" /></span>}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{track.title}</span><span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{track.artist}</span></span>
          </Button>
          <Button variant="ghost" size="icon" aria-label={liked ? "Unsave track" : "Save track"} aria-pressed={liked} disabled={saving} onClick={() => void toggleLike()} className={`hidden shrink-0 md:inline-flex ${liked ? "text-primary" : "text-muted-foreground"}`}><Heart fill={liked ? "currentColor" : "none"} /></Button>
        </div>
        <div className="flex shrink-0 items-center justify-center gap-1 md:gap-3">
          <Button variant="ghost" size="icon" aria-label="Shuffle" aria-pressed={p.shuffle} onClick={p.toggleShuffle} className={`hidden md:inline-flex ${p.shuffle ? "text-primary" : "text-muted-foreground"}`}><Shuffle /></Button>
          <Button variant="ghost" size="icon" aria-label="Previous" onClick={p.prev} className="hidden md:inline-flex"><SkipBack /></Button>
          <Button variant="ghost" size="icon" aria-label={p.isPlaying ? "Pause" : "Play"} onClick={p.toggle} className="h-11 w-11 md:rounded-full md:bg-primary md:text-primary-foreground [&_svg]:size-6">{p.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button>
          <Button variant="ghost" size="icon" aria-label="Next" onClick={p.next} className="h-10 w-10 [&_svg]:size-5"><SkipForward fill="currentColor" /></Button>
          <Button variant="ghost" size="icon" aria-label={`Repeat ${p.repeat}`} onClick={p.cycleRepeat} className={`hidden md:inline-flex ${p.repeat !== "off" ? "text-primary" : "text-muted-foreground"}`}>{p.repeat === "one" ? <Repeat1 /> : <Repeat />}</Button>
        </div>
        <div className="hidden min-w-0 items-center justify-end gap-3 md:flex"><span className="text-xs tabular-nums text-muted-foreground">{formatPlayerTime(p.progress)} / {formatPlayerTime(p.duration)}</span><Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" /><input type="range" aria-label="Music volume" min={0} max={1} step={0.01} value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} className="w-20 accent-primary" /><Button variant="ghost" size="icon" aria-label="Queue" onClick={() => setExpanded(true)}><ListMusic /></Button></div>
      </div>
    </section>}
  </>;
}
