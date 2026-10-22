import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, Download, Heart, Info, ListMusic, Mic2, MoreHorizontal, Pause, Play, Repeat, Repeat1, Share2, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePlayer, type PlayerTrack } from "@/lib/player-context";
import { useAuth } from "@/lib/auth-context";
import { getMyTrackLikes, toggleTrackLike } from "@/lib/track-likes.functions";
import { SignedImg } from "@/components/ui/signed-img";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function formatPlayerTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export async function shareMusic(track: PlayerTrack) {
  const url = track.artistId ? `${window.location.origin}/artist/${encodeURIComponent(track.artistId)}` : `${window.location.origin}/`;
  try {
    if (navigator.share) await navigator.share({ title: track.title, text: `${track.title} — ${track.artist}`, url });
    else { await navigator.clipboard.writeText(url); toast.success("Music link copied"); }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Couldn't share this music");
  }
}

export function MusicDetails({ nowPlaying, onClose }: { nowPlaying: boolean; onClose: () => void }) {
  const p = usePlayer();
  const auth = useAuth();
  const qc = useQueryClient();
  const track = nowPlaying ? p.track : p.detailTrack;
  const queue = nowPlaying ? p.queue : p.detailQueue;
  const [credits, setCredits] = useState(false);
  const [showQueue, setShowQueue] = useState(!nowPlaying);
  const [saving, setSaving] = useState(false);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const ids = queue.map((t) => t.id);
  const likes = useQuery({ queryKey: ["my-track-likes", ids], queryFn: () => getMyTrackLikes({ data: { trackIds: ids } }), enabled: !!auth.user && ids.length > 0 });
  if (!track) return null;
  const current = p.track?.id === track.id;
  const liked = likes.data?.liked.includes(track.id) ?? false;
  const like = async (t: PlayerTrack) => {
    if (!auth.user) { toast.error("Sign in to save music"); return; }
    if (saving) return;
    setSaving(true);
    try { await toggleTrackLike({ data: { trackId: t.id } }); await qc.invalidateQueries({ queryKey: ["my-track-likes"] }); qc.invalidateQueries({ queryKey: ["artist-meta"] }); }
    catch { toast.error("Couldn't save this track"); }
    finally { setSaving(false); }
  };
  const start = (t: PlayerTrack) => { if (p.track?.id === t.id) p.toggle(); else p.play(t, queue.filter((q) => !!q.audioUrl)); };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="swara-music-detail music-detail-dialog left-0 top-0 block translate-x-0 translate-y-0 overflow-y-auto p-0">
        {track.coverUrl && <SignedImg src={track.coverUrl} alt="" aria-hidden className="music-detail-backdrop" />}
        <div className="music-detail-shade" aria-hidden />
        <div className="music-detail-content relative mx-auto max-w-2xl px-5 pb-8 pt-5 sm:px-10">
          <header className="mb-6 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" aria-label="Back to music" onClick={onClose}>{nowPlaying ? <ChevronDown /> : <ArrowLeft />}</Button>
            <div className="min-w-0 text-center text-xs text-brand-silver">{nowPlaying ? "NOW PLAYING" : "TUNEVIO MUSIC"}</div>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" aria-label="Music options"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void shareMusic(track)}><Share2 /> Share music</DropdownMenuItem><DropdownMenuItem onSelect={() => setCredits(true)}><Info /> Credits</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </header>
          <div className="music-detail-art mx-auto aspect-square overflow-hidden rounded-lg bg-secondary">
            {track.coverUrl && failedCover !== track.coverUrl ? <SignedImg src={track.coverUrl} alt={`${track.title} artwork`} onError={() => setFailedCover(track.coverUrl ?? null)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Mic2 className="h-16 w-16 text-muted-foreground" /></div>}
          </div>
          <div className={nowPlaying ? "mt-7" : "mt-7 text-center"}>
            <DialogTitle className="break-words text-2xl font-bold leading-tight sm:text-3xl">{track.title}</DialogTitle>
            <DialogDescription className="mt-2 text-base text-brand-silver">{track.artistId ? <Link to="/artist/$id" params={{ id: track.artistId }} onClick={onClose}>{track.artist}</Link> : track.artist}</DialogDescription>
            {track.preview && <p className="mt-2 text-xs text-muted-foreground">30-second preview</p>}
          </div>
          {nowPlaying ? <>
            <div className="mt-7"><input type="range" aria-label="Seek music" min={0} max={p.duration || 1} step={0.1} value={Math.min(p.progress, p.duration || 1)} disabled={!p.duration} onChange={(e) => p.seek(Number(e.target.value))} style={{ background: `linear-gradient(to right, var(--primary) ${p.duration ? Math.min(p.progress / p.duration, 1) * 100 : 0}%, var(--music-progress-track) 0)` }} className="music-expanded-progress w-full" /><div className="mt-3 flex justify-between text-xs tabular-nums text-brand-silver"><span>{formatPlayerTime(p.progress)}</span><span>{formatPlayerTime(p.duration)}</span></div></div>
            <div className="my-7 flex items-center justify-between gap-2">
              <Button variant="ghost" size="icon" aria-label="Shuffle music" aria-pressed={p.shuffle} onClick={p.toggleShuffle} className={p.shuffle ? "text-primary" : "text-muted-foreground"}><Shuffle /></Button>
              <Button variant="ghost" size="icon" aria-label="Previous track" onClick={p.prev} className="h-12 w-12 [&_svg]:size-7"><SkipBack fill="currentColor" /></Button>
              <Button size="icon" aria-label={p.isPlaying ? "Pause music" : "Play music"} onClick={p.toggle} className="h-16 w-16 rounded-full [&_svg]:size-8">{p.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button>
              <Button variant="ghost" size="icon" aria-label="Next track" onClick={p.next} className="h-12 w-12 [&_svg]:size-7"><SkipForward fill="currentColor" /></Button>
              <Button variant="ghost" size="icon" aria-label={`Repeat ${p.repeat}`} onClick={p.cycleRepeat} className={p.repeat !== "off" ? "text-primary" : "text-muted-foreground"}>{p.repeat === "one" ? <Repeat1 /> : <Repeat />}</Button>
            </div>
          </> : <div className="mt-7 grid grid-cols-2 gap-3"><Button className="h-14 rounded-lg text-lg" disabled={!track.audioUrl} onClick={() => start(track)}>{current && p.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}{current && p.isPlaying ? "Pause" : "Play"}</Button><Button variant="secondary" className="h-14 rounded-lg text-lg" disabled={!queue.some((t) => t.audioUrl)} aria-pressed={p.shuffle} onClick={() => { if (!p.shuffle) p.toggleShuffle(); const playable = queue.filter((t) => !!t.audioUrl); const t = playable[Math.floor(Math.random() * playable.length)]; if (t) p.play(t, playable); }}><Shuffle /> Shuffle</Button></div>}
          <div className="my-6 grid grid-cols-4 gap-1">
            <Button variant="ghost" className={`h-auto flex-col gap-2 px-1 py-3 text-xs ${liked ? "text-primary" : "text-brand-silver"}`} aria-pressed={liked} disabled={saving} onClick={() => void like(track)}><Heart fill={liked ? "currentColor" : "none"} className="!size-6" />{liked ? "Saved" : "Save"}</Button>
            <Button variant="ghost" className="h-auto flex-col gap-2 px-1 py-3 text-xs text-brand-silver" onClick={() => setCredits((v) => !v)}><Info className="!size-6" />Credits</Button>
            <span title="Downloads are not enabled for this music"><Button variant="ghost" disabled className="h-auto w-full flex-col gap-2 px-1 py-3 text-xs text-brand-silver" aria-label="Download unavailable"><Download className="!size-6" />Download</Button></span>
            <Button variant="ghost" className="h-auto flex-col gap-2 px-1 py-3 text-xs text-brand-silver" onClick={() => void shareMusic(track)}><Share2 className="!size-6" />Share</Button>
          </div>
          {credits && <section className="mb-6 border-y border-border py-4"><h2 className="text-sm font-semibold">Track credits</h2><p className="mt-3 text-xs text-muted-foreground">Artist</p><p className="mt-1 text-sm">{track.artist}</p><p className="mt-3 text-xs text-muted-foreground">Additional credits haven’t been provided for this track.</p></section>}
          {nowPlaying && <Button variant="ghost" className="mb-2 w-full justify-start" onClick={() => setShowQueue((v) => !v)} aria-expanded={showQueue}><ListMusic /> Up next · {queue.length}</Button>}
          {showQueue && <ol className="divide-y divide-border/50">{queue.map((t, i) => <li key={`${t.id}:${i}`} className="grid grid-cols-[24px_minmax(0,1fr)_40px] items-center gap-3 py-3"><span className="text-sm tabular-nums text-muted-foreground">{p.track?.id === t.id && p.isPlaying ? <span className="text-primary">♫</span> : i + 1}</span><Button variant="ghost" className="h-auto min-w-0 justify-start whitespace-normal px-0 py-2 text-left hover:bg-transparent hover:text-primary" disabled={!t.audioUrl} onClick={() => start(t)}><span className="min-w-0"><span className={`block break-words text-base font-semibold ${p.track?.id === t.id ? "text-primary" : "text-foreground"}`}>{t.title}</span><span className="mt-1 block text-sm font-normal text-muted-foreground">{t.artist}</span></span></Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Options for ${t.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!t.audioUrl} onSelect={() => start(t)}><Play /> Play / pause</DropdownMenuItem><DropdownMenuItem disabled={saving} onSelect={() => void like(t)}><Heart />{likes.data?.liked.includes(t.id) ? "Remove from saved" : "Save track"}</DropdownMenuItem><DropdownMenuItem onSelect={() => void shareMusic(t)}><Share2 /> Share</DropdownMenuItem></DropdownMenuContent></DropdownMenu></li>)}</ol>}
        </div>
      </DialogContent>
    </Dialog>
  );
}