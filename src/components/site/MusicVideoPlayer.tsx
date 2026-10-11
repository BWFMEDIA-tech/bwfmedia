import { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;

export function MusicVideoPlayer({ src, poster, title }: { src: string | null; poster: string | null; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(1);
  const toggle = async () => {
    if (!video.current || !src) return;
    try { if (video.current.paused) await video.current.play(); else video.current.pause(); }
    catch { setError('This video could not start. Please try again.'); }
  };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await frame.current?.requestFullscreen(); }
    catch { setError('Full screen is unavailable on this device.'); }
  };
  return <div ref={frame} className="group relative aspect-video w-full overflow-hidden rounded-lg border border-primary/60 bg-background">
    <video ref={video} src={src ?? undefined} poster={poster ?? undefined} playsInline preload="metadata" aria-label={title}
      className="h-full w-full object-contain" onClick={() => void toggle()}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onTimeUpdate={() => setPosition(video.current?.currentTime ?? 0)}
      onLoadedMetadata={() => { const d = video.current?.duration; setDuration(d && Number.isFinite(d) ? d : 0); setError(''); }}
      onWaiting={() => setWaiting(true)} onCanPlay={() => setWaiting(false)} onPlaying={() => setWaiting(false)}
      onError={() => setError('Video unavailable. Please reload or try another video.')} />
    {!error && <Button variant="ghost" size="icon" aria-label={playing ? 'Pause video' : 'Play video'} disabled={!src} onClick={() => void toggle()}
      className={`absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/70 bg-background/70 text-primary transition-opacity [&_svg]:size-7 ${playing ? 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100' : 'opacity-100'}`}>
      {!src || waiting ? <LoaderCircle className="animate-spin" /> : playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
    </Button>}
    {error && <p role="alert" className="absolute inset-x-4 top-1/3 rounded-md bg-background/90 p-3 text-center text-sm text-foreground">{error}</p>}
    <div className="absolute inset-x-0 bottom-0 bg-background/85 px-3 py-2 text-foreground sm:px-4">
      <input aria-label="Seek video" type="range" min="0" max={duration || 1} step="0.1" value={position} disabled={!duration}
        className="block h-3 w-full accent-primary" onChange={(e) => { const t = Number(e.target.value); if (video.current) video.current.currentTime=t; setPosition(t); }} />
      <div className="mt-1 flex min-w-0 items-center gap-1 sm:gap-2">
        <Button size="icon" variant="ghost" aria-label={playing ? 'Pause' : 'Play'} onClick={() => void toggle()} disabled={!src}>{playing ? <Pause /> : <Play />}</Button>
        <span className="shrink-0 text-[11px] tabular-nums sm:text-xs">{time(position)} <span className="text-muted-foreground">/ −{time(Math.max(0,duration-position))}</span></span>
        <div className="ml-auto flex min-w-0 items-center gap-1">
          <Button size="icon" variant="ghost" aria-label={muted ? 'Unmute video' : 'Mute video'} onClick={() => { if (video.current) video.current.muted=!muted; setMuted(!muted); }}>{muted || volume===0 ? <VolumeX /> : <Volume2 />}</Button>
          <input type="range" aria-label="Video volume" min="0" max="1" step="0.05" value={muted ? 0 : volume} className="hidden w-20 accent-primary sm:block" onChange={(e) => { const v=Number(e.target.value); if(video.current){video.current.volume=v;video.current.muted=false;} setVolume(v);setMuted(false); }} />
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Playback settings"><Settings /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
            {[0.5,0.75,1,1.25,1.5,2].map(r => <DropdownMenuItem key={r} onSelect={() => { if(video.current)video.current.playbackRate=r;setRate(r); }}>{r===1 ? 'Normal' : `${r}×`}{r===rate ? ' ✓' : ''}</DropdownMenuItem>)}
          </DropdownMenuContent></DropdownMenu>
          <Button size="icon" variant="ghost" aria-label="Full screen" onClick={() => void fullscreen()}><Maximize /></Button>
        </div>
      </div>
    </div>
  </div>;
}