import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSignedVideoUrl } from "@/lib/video-urls";
import { useServerFn } from "@tanstack/react-start";
import { getSavedVideos, setVideoSaved } from "@/lib/video-engagement.functions";
import { Button } from "@/components/ui/button";
import { Upload, Play, Pause, Plus, Check, Search, ChevronLeft, ChevronRight, ArrowLeft, Bookmark, Share2, Volume2, VolumeX, Maximize, ListVideo, Shuffle, Repeat, SkipBack, SkipForward, X, Film, LoaderCircle } from "lucide-react";
import logo from "@/assets/tunevio-logo.png.asset.json";
import { OFF_THE_BLOCK_VIDEOS } from "@/lib/off-the-block-videos";

export const Route = createFileRoute("/videos/")({
  validateSearch: (s: Record<string, unknown>): { upload?: boolean } => (s.upload ? { upload: true } : {}),
  component: VideosPage,
  head: () => ({ meta: [
    { title: "Music Videos — Watch & Discover | TUNEVIO" },
    { name: "description", content: "Discover music videos, new releases, original films and live performances on Tunevio. Watch your favorite artists and save your next watch." },
    { property: "og:title", content: "Music Videos — Watch & Discover | TUNEVIO" },
    { property: "og:description", content: "Explore independent music videos and live performances on Tunevio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://tunevio.com/videos" }] }),
});
type VideoRow = { id: string; user_id: string; title: string; artist: string | null; description: string | null; genre: string | null; category: "music" | "sponsored"; storage_path: string; external_url: string | null; thumbnail_path: string | null; created_at: string; };
function VideoThumb({ v, className = "h-full w-full object-cover", eager = false }: { v: VideoRow; className?: string; eager?: boolean }) {
  const thumb = useSignedVideoUrl(v.thumbnail_path);
  const fallback = useSignedVideoUrl(v.thumbnail_path ? null : v.storage_path);
  if (thumb) return <img src={thumb} alt={v.title} loading={eager ? "eager" : "lazy"} className={className} />;
  if (fallback) return <video src={`${fallback}#t=0.1`} muted playsInline preload="metadata" aria-label={v.title} className={className} />;
  return <div className={`${className} grid place-items-center bg-muted`}><Film className="size-10 text-muted-foreground" /></div>;
}
async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = url;
      const cleanup = () => URL.revokeObjectURL(url);
      video.onloadedmetadata = () => {
        try {
          video.currentTime = Math.min(1, (video.duration || 2) / 2);
        } catch {
          cleanup();
          resolve(null);
        }
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        const scale = Math.min(1, 1280 / w);
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); resolve(null); return; }
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => { cleanup(); resolve(blob); }, "image/jpeg", 0.85);
        } catch {
          cleanup();
          resolve(null);
        }
      };
      video.onerror = () => { cleanup(); resolve(null); };
    } catch {
      resolve(null);
    }
  });
}

function captureFrameFromVideoEl(video: HTMLVideoElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const scale = Math.min(1, 1280 / w);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    } catch {
      resolve(null);
    }
  });
}

const GENRES = ["All genres", "Hip Hop", "R&B", "Pop", "Rock", "Electronic", "Afrobeats"];
function matches(v: VideoRow, pattern: RegExp) { return pattern.test(`${v.title} ${v.description ?? ""}`); }
function formatSeconds(n: number) { const t = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; }
function VideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false), [canUpload, setCanUpload] = useState(false);
  const wantsUpload = Route.useSearch().upload === true;
  const [search, setSearch] = useState(""), [genre, setGenre] = useState("All genres"), [tab, setTab] = useState("Discover");
  const [savedIds, setSavedIds] = useState<string[]>([]), [saving, setSaving] = useState(false);
  const save = useServerFn(setVideoSaved), savedFetch = useServerFn(getSavedVideos);
  const [activeId, setActiveId] = useState<string | null>(null), [playerOpen, setPlayerOpen] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const interview = OFF_THE_BLOCK_VIDEOS.find(v => v.id === interviewId);
  const interviews = OFF_THE_BLOCK_VIDEOS.filter(v => `${v.title} ${v.subtitle}`.toLowerCase().includes(search.trim().toLowerCase()));
  const [playing, setPlaying] = useState(false), [queueOpen, setQueueOpen] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false), [repeatEnabled, setRepeatEnabled] = useState(false);
  const [volume, setVolume] = useState(0.8), [muted, setMuted] = useState(false);
  const [position, setPosition] = useState(0), [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null), frameRef = useRef<HTMLDivElement>(null);
  const hero = videos.find(v => v.id === activeId) ?? videos[0];
  const src = useSignedVideoUrl(hero?.storage_path), poster = useSignedVideoUrl(hero?.thumbnail_path);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    setSavedIds([]); setCanUpload(false);
    if (!userId) return;
    savedFetch().then(rows => { if (active) setSavedIds(rows.map(r => r.video_id)); }).catch(() => { if (active) setError("Your list could not load. Please try again."); });
    supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["artist", "admin"]).then(({ data }) => {
      if (!active) return;
      const allowed = !!data?.length; setCanUpload(allowed); if (allowed && wantsUpload) setShowUpload(true);
    });
    return () => { active = false; };
  }, [userId, wantsUpload]);
  const load = async () => {
    setLoading(true); setError("");
    const { data, error: err } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (err) setError("Videos could not load. Please try again.");
    else setVideos((data as VideoRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { setPlaying(false); setPosition(0); setDuration(0); }, [hero?.id]);
  useEffect(() => { const v = videoRef.current; if (v) { v.volume = volume; v.muted = muted; } }, [volume, muted, playerOpen, src]);
  const toggleSaved = async (v: VideoRow) => {
    if (!userId) { window.location.assign(`/login?redirect=${encodeURIComponent("/videos")}`); return; }
    if (saving) return;
    const saved = !savedIds.includes(v.id); setSaving(true); setError("");
    try { await save({ data: { videoId: v.id, saved } }); setSavedIds(ids => saved ? [...ids, v.id] : ids.filter(id => id !== v.id)); }
    catch { setError("Your list could not be updated. Please try again."); }
    finally { setSaving(false); }
  };
  const playVideo = (v: VideoRow) => { setActiveId(v.id); setPlayerOpen(true); setError(""); };
  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play().catch(() => setError("Tap Play to start this video.")); else v.pause(); };
  const step = (dir: number) => {
    if (!hero || !videos.length) return;
    const index = videos.findIndex(v => v.id === hero.id);
    const next = shuffleEnabled && videos.length > 1 ? (index + 1 + Math.floor(Math.random() * (videos.length - 1))) % videos.length : (index + dir + videos.length) % videos.length;
    playVideo(videos[next]);
  };
  const share = async () => {
    if (!hero) return;
    const url = `${window.location.origin}/videos/${hero.id}`;
    try { if (navigator.share) await navigator.share({ title: hero.title, url }); else { await navigator.clipboard.writeText(url); setError("Video link copied."); } } catch { /* share dismissed */ }
  };
  const filtered = videos.filter(v => {
    const text = `${v.title} ${v.artist ?? ""} ${v.description ?? ""}`.toLowerCase();
    const picked = (v.genre ?? "").toLowerCase();
    // Prefer the stored genre; older uploads without one keep the text-based match.
    const genreMatch = genre === "All genres" || (picked
      ? picked === genre.toLowerCase()
      : (genre === "Hip Hop" ? /hip[ -]?hop|rap/.test(text) : genre === "R&B" ? /r&b|rnb|rhythm and blues/.test(text) : text.includes(genre.toLowerCase())));
    return text.includes(search.trim().toLowerCase()) && genreMatch && (tab !== "My List" || savedIds.includes(v.id)) && (tab !== "My Videos" || v.user_id === userId);
  });
  const music = filtered.filter(v => v.category === "music");
  const rows = [
    { title: "Trending Music Videos", items: music },
    { title: "New Releases", items: music },
    { title: "Tunevio Originals", items: filtered.filter(v => matches(v, /(?:tunevio|bwf)\s+original/i)) },
    { title: "Live Performances", items: music.filter(v => matches(v, /\blive\b|performance|concert|session/i)) },
    { title: "Underground Spotlight", items: music.filter(v => !matches(v, /(?:tunevio|bwf)\s+original|\blive\b|concert/i)) },
    { title: "Sponsored & Partners", items: filtered.filter(v => v.category === "sponsored") },
  ];
  return <div className="video-cinema min-h-screen bg-background text-foreground font-body">
    <header className="cinema-header border-b border-border">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-4 px-5 py-4 sm:px-10 lg:px-14">
        <Link to="/" aria-label="Tunevio home" className="shrink-0"><img src={logo.url} alt="Tunevio" className="w-28 sm:w-36" /></Link>
        <span className="hidden border-l border-border pl-4 text-xs font-semibold text-muted-foreground sm:block">VIDEO NETWORK</span>
        <nav aria-label="Video navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {["Discover", "My List", ...(canUpload ? ["My Videos"] : [])].map(name => <Button key={name} variant="ghost" onClick={() => setTab(name)} aria-pressed={tab === name} className={tab === name ? "text-foreground cinema-tab-active" : "text-muted-foreground"}>{name === "My List" && <Bookmark />}{name}</Button>)}
          <Button asChild variant="ghost" className="text-muted-foreground"><Link to="/recordings">Recordings</Link></Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" title="Return to Tunevio"><Link to="/"><ArrowLeft /><span className="sr-only">Return to Tunevio</span></Link></Button>
          {canUpload ? <Button onClick={() => setShowUpload(true)} className="px-3"><Upload /><span className="hidden sm:inline">Upload video</span><span className="sr-only sm:hidden">Upload video</span></Button> : !userId ? <Button asChild variant="secondary"><Link to="/login">Sign in</Link></Button> : null}
        </div>
      </div>
    </header>
    <main>
      {tab === "Discover" && !search && genre === "All genres" && <section className="cinema-hero relative overflow-hidden" aria-label="Featured music video">
        {loading ? <div className="absolute inset-0 animate-pulse bg-muted" /> : hero ? <VideoThumb v={hero} eager className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-muted" />}
        <div className="cinema-hero-shade absolute inset-0" />
        <div className="relative mx-auto flex h-full max-w-[1680px] items-end px-5 pb-16 pt-10 sm:px-10 sm:pb-20 lg:px-14">
          <div className="max-w-xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase"><span className="cinema-mark">T</span> {hero ? "Featured music video" : "Music videos"}</p>
            <h1 className="cinema-title text-4xl font-bold leading-tight sm:text-6xl">{loading ? "Tunevio Videos" : hero?.title ?? "Tunevio Videos"}</h1>
            {hero ? <><div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><Link to="/artist/$id" params={{ id: hero.user_id }} className="font-semibold hover:underline">{hero.artist ?? "Tunevio artist"}</Link><span className="text-muted-foreground">{new Date(hero.created_at).getFullYear()}</span><span className="border border-border px-2 py-0.5 text-[10px] uppercase">{hero.category === "sponsored" ? "Sponsored" : "Music video"}</span></div>
              {hero.description && <p className="mt-4 line-clamp-3 max-w-lg text-sm leading-relaxed text-brand-silver sm:text-base">{hero.description}</p>}
              <div className="mt-7 flex flex-wrap gap-3"><Button size="lg" onClick={() => playVideo(hero)} className="h-12 px-7 font-bold"><Play fill="currentColor" />Play</Button><Button variant="secondary" size="lg" disabled={saving} onClick={() => void toggleSaved(hero)} className="h-12 px-5 font-semibold">{savedIds.includes(hero.id) ? <Check /> : <Plus />}{savedIds.includes(hero.id) ? "In My List" : "Add to My List"}</Button><Button asChild size="icon" variant="ghost" title="Video details" className="h-12 w-12 border border-border"><Link to="/videos/$id" params={{ id: hero.id }}><ListVideo /><span className="sr-only">Video details</span></Link></Button></div>
            </> : !loading && <p className="mt-4 text-muted-foreground">No videos available yet.</p>}
          </div>
        </div>
        <span className="absolute bottom-7 right-5 hidden text-xs text-muted-foreground sm:block sm:right-10">TUNEVIO / WATCH</span>
      </section>}
      <div className="relative mx-auto max-w-[1680px] space-y-9 px-5 pb-16 pt-6 sm:px-10 lg:px-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div><p className="text-[10px] font-semibold uppercase text-primary">TUNEVIO VIDEO NETWORK</p><h2 className="mt-1 text-xl font-semibold">{tab === "Discover" ? "Find your next favorite." : tab}</h2></div>
          <div className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} type="search" aria-label="Search videos and artists" placeholder="Search videos, artists…" className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary" /></div>
          <div className="flex w-full gap-2 overflow-x-auto pb-1" aria-label="Genres">{GENRES.map(name => <Button key={name} size="sm" variant={genre === name ? "default" : "secondary"} aria-pressed={genre === name} onClick={() => setGenre(name)} className="shrink-0">{name}</Button>)}</div>
        </div>
        {error && <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-brand-silver">{error}<Button variant="ghost" size="sm" onClick={() => { setError(""); void load(); }}>Retry</Button></div>}
        {loading ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="aspect-video animate-pulse rounded-md bg-muted" />)}</div> : tab !== "Discover" || search || genre !== "All genres" ? <Shelf title={search ? "Search results" : genre !== "All genres" ? genre : tab} videos={filtered} onPlay={playVideo} savedIds={savedIds} onSave={toggleSaved} saving={saving} /> : rows.map(row => <Shelf key={row.title} title={row.title} videos={row.items} onPlay={playVideo} savedIds={savedIds} onSave={toggleSaved} saving={saving} />)}
        {tab === "Discover" && genre === "All genres" && interviews.length > 0 && <section aria-label="Off the Block">
          <h2 className="mb-4 text-lg font-semibold sm:text-2xl">Off the Block</h2>
          <div className="cinema-rail flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {interviews.map(v => <article key={v.id} className="w-[260px] shrink-0 snap-start sm:w-[320px] lg:w-[360px]">
              <Button variant="secondary" onClick={() => setInterviewId(v.id)} aria-label={`Play ${v.title}`} className="relative aspect-video h-auto w-full overflow-hidden p-0">
                <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={v.title} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-background/80"><Play className="size-4" fill="currentColor" /></span>
              </Button>
              <Button variant="link" onClick={() => setInterviewId(v.id)} className="mt-3 h-auto justify-start whitespace-normal p-0 text-left text-sm font-semibold text-foreground">{v.title}</Button>
              <Link to="/off-the-block" className="mt-1 block text-xs text-muted-foreground">{v.subtitle}</Link>
            </article>)}
          </div>
        </section>}
      </div>
    </main>
    {playerOpen && hero && <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-3 backdrop-blur-md sm:p-8" role="dialog" aria-modal="true" aria-label={`Watching ${hero.title}`} onKeyDown={e => { if (e.key === "Escape") setPlayerOpen(false); }}>
      <div className="mx-auto max-w-6xl"><div className="mb-4 flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{hero.title}</h2><p className="text-sm text-muted-foreground">{hero.artist ?? "Tunevio artist"}</p></div><Button variant="secondary" size="icon" onClick={() => { videoRef.current?.pause(); setPlayerOpen(false); }} autoFocus aria-label="Close player"><X /></Button></div>
      <div ref={frameRef} className="aspect-video overflow-hidden rounded-md bg-background"><video key={hero.id} ref={videoRef} src={src ?? undefined} poster={poster ?? undefined} controls autoPlay playsInline preload="metadata" className="h-full w-full object-contain" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={e => setPosition(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onError={() => setError("This video is unavailable. Please try again.")} onEnded={() => { if (repeatEnabled && videoRef.current) { videoRef.current.currentTime = 0; void videoRef.current.play(); } else step(1); }} /></div>
      {error && <p role="alert" className="mt-3 text-sm text-brand-silver">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="icon" aria-label="Previous video" onClick={() => step(-1)}><SkipBack /></Button><Button size="icon" aria-label={playing ? "Pause video" : "Play video"} disabled={!src} onClick={togglePlay}>{!src ? <LoaderCircle className="animate-spin" /> : playing ? <Pause /> : <Play />}</Button><Button variant="secondary" size="icon" aria-label="Next video" onClick={() => step(1)}><SkipForward /></Button>
        <span className="text-xs tabular-nums text-muted-foreground">{formatSeconds(position)} / {formatSeconds(duration)}</span>
        <Button variant="ghost" size="icon" aria-label="Shuffle" aria-pressed={shuffleEnabled} className={shuffleEnabled ? "text-primary" : ""} onClick={() => setShuffleEnabled(!shuffleEnabled)}><Shuffle /></Button><Button variant="ghost" size="icon" aria-label="Repeat" aria-pressed={repeatEnabled} className={repeatEnabled ? "text-primary" : ""} onClick={() => setRepeatEnabled(!repeatEnabled)}><Repeat /></Button>
        <Button variant="ghost" size="icon" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button><input type="range" aria-label="Volume" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-20 accent-primary" />
        <Button variant="ghost" size="icon" aria-label="Fullscreen" onClick={() => { frameRef.current?.requestFullscreen().catch(() => { const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null; v?.webkitEnterFullscreen?.(); }); }}><Maximize /></Button><Button variant="ghost" size="icon" aria-label="Video queue" aria-expanded={queueOpen} onClick={() => setQueueOpen(!queueOpen)}><ListVideo /></Button><Button variant="ghost" size="icon" aria-label="Share video" onClick={() => void share()}><Share2 /></Button><Button asChild variant="secondary"><Link to="/videos/$id" params={{ id: hero.id }}>Details & comments</Link></Button>
      </div>
      {queueOpen && <div className="mt-5 grid gap-2 sm:grid-cols-2">{videos.map(v => <Button key={v.id} variant="secondary" onClick={() => playVideo(v)} className="h-auto justify-start whitespace-normal py-3 text-left"><Play />{v.title}</Button>)}</div>}
      </div>
    </div>}
    {showUpload && userId && <UploadModal userId={userId} onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); void load(); }} />}
    {interview && <div role="dialog" aria-modal="true" aria-label={`Watching ${interview.title}`} className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-3 backdrop-blur-md sm:p-8" onKeyDown={e => { if (e.key === "Escape") setInterviewId(null); }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold">{interview.title}</h2><Button autoFocus variant="secondary" size="icon" aria-label="Close interview" onClick={() => setInterviewId(null)}><X /></Button></div>
        <iframe key={interview.id} src={`https://www.youtube.com/embed/${interview.id}?autoplay=1&rel=0`} title={interview.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="aspect-video w-full rounded-md border border-border" />
        <div className="mt-4 flex flex-wrap gap-2">{OFF_THE_BLOCK_VIDEOS.map(v => <Button key={v.id} variant={v.id === interview.id ? "default" : "secondary"} onClick={() => setInterviewId(v.id)} className="h-auto whitespace-normal text-left"><Play />{v.title}</Button>)}</div>
      </div>
    </div>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-7 text-xs text-muted-foreground sm:px-10 lg:px-14"><span>TUNEVIO · VIDEO NETWORK</span><div className="flex gap-5"><Link to="/help">Help</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></footer>
  </div>;
}
function Shelf({ title, videos, onPlay, savedIds, onSave, saving }: { title: string; videos: VideoRow[]; onPlay: (v: VideoRow) => void; savedIds: string[]; onSave: (v: VideoRow) => Promise<void>; saving: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  return <section aria-label={title}><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><h2 className="text-lg font-semibold sm:text-2xl">{title}</h2></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label={`Scroll ${title} left`} disabled={!videos.length} onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth * .8, behavior: "smooth" })}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label={`Scroll ${title} right`} disabled={!videos.length} onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth * .8, behavior: "smooth" })}><ChevronRight /></Button></div></div>
    {videos.length ? <div ref={rail} className="cinema-rail -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">{videos.map(v => <article key={v.id} className="group w-[260px] shrink-0 snap-start sm:w-[320px] lg:w-[360px]">
      <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-card"><Button variant="ghost" onClick={() => onPlay(v)} aria-label={`Play ${v.title}`} className="h-full w-full rounded-none p-0 hover:bg-transparent"><VideoThumb v={v} className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" /><span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-background/80 text-foreground"><Play className="size-4" fill="currentColor" /></span></Button><Button size="icon" variant="secondary" title={savedIds.includes(v.id) ? "Remove from My List" : "Add to My List"} aria-label={`${savedIds.includes(v.id) ? "Remove" : "Save"} ${v.title}`} disabled={saving} onClick={() => void onSave(v)} className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-background/80">{savedIds.includes(v.id) ? <Check /> : <Plus />}</Button></div>
      <Link to="/videos/$id" params={{ id: v.id }} className="mt-3 block break-words text-sm font-semibold leading-snug hover:text-primary">{v.title}</Link><Link to="/artist/$id" params={{ id: v.user_id }} className="mt-1 block text-xs text-muted-foreground hover:text-foreground">{v.artist ?? "Tunevio artist"}</Link>
    </article>)}</div> : <p className="border-b border-border py-5 text-sm text-muted-foreground">{title === "My List" ? "No saved videos yet." : "No videos available in this collection yet."}</p>}
  </section>;
}
/* ---------- Upload Modal ---------- */
function UploadModal({ userId, onClose, onUploaded }: { userId: string; onClose: () => void; onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [category, setCategory] = useState<"music" | "sponsored">("music");
  const [genre, setGenre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!file) { setVideoUrl(null); return; }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setThumbBlob(null);
    setThumbPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setCurrentTime(0);
    setDuration(0);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const captureNow = async () => {
    const v = videoRef.current;
    if (!v) return;
    setCapturing(true);
    try {
      const wasPaused = v.paused;
      if (!wasPaused) v.pause();
      const blob = await captureFrameFromVideoEl(v);
      if (blob) {
        setThumbBlob(blob);
        setThumbPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
      }
    } finally {
      setCapturing(false);
    }
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || t, t));
    setCurrentTime(v.currentTime);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr("Pick a video file"); return; }
    setBusy(true); setErr(null);
    const ext = file.name.split(".").pop() || "mp4";
    const stamp = Date.now();
    const path = `${userId}/${stamp}.${ext}`;
    const up = await supabase.storage.from("videos").upload(path, file, { contentType: file.type });
    if (up.error) { setErr(up.error.message); setBusy(false); return; }

    // Use user-picked thumbnail if available; otherwise fall back to an auto-grab.
    let thumbnail_path: string | null = null;
    try {
      const blob = thumbBlob ?? (await captureVideoThumbnail(file));
      if (blob) {
        const tPath = `${userId}/${stamp}-thumb.jpg`;
        const tUp = await supabase.storage.from("videos").upload(tPath, blob, { contentType: "image/jpeg" });
        if (!tUp.error) thumbnail_path = tPath;
      }
    } catch { /* non-fatal */ }

    const ins = await supabase.from("videos").insert({
      user_id: userId, title, artist: artist || null, description: description || null,
      category, storage_path: path, external_url: externalUrl || null,
      thumbnail_path, genre: genre || null,
    });
    setBusy(false);
    if (ins.error) { setErr(ins.error.message); return; }
    onUploaded();
  };

  return (
    <Modal onClose={onClose} title="Upload Video">
      <form onSubmit={submit} className="space-y-4">
        <input required aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          className="w-full bg-card border border-border/20 px-4 py-3 text-foreground focus:border-primary outline-none" />
        <input aria-label="Artist or sponsor" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist / Sponsor"
          className="w-full bg-card border border-border/20 px-4 py-3 text-foreground focus:border-primary outline-none" />
        <textarea aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3}
          className="w-full bg-card border border-border/20 px-4 py-3 text-foreground focus:border-primary outline-none" />
        <input type="url" aria-label="External link" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="External link (YouTube, Spotify, sponsor URL…)"
          className="w-full bg-card border border-border/20 px-4 py-3 text-foreground focus:border-primary outline-none" />
        <div className="flex gap-2">
          {(["music", "sponsored"] as const).map((c) => (
            <Button key={c} type="button" onClick={() => setCategory(c)}
              className={`flex-1 py-2 font-cond font-bold tracking-[0.25em] text-[11px] uppercase border ${
                category === c ? "text-foreground bg-primary/30" : "text-foreground/60 border-border/20"
              }`}
              >
              {c === "music" ? "Music Video" : "Sponsored"}
            </Button>
          ))}
        </div>
        <div>
          <p className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-foreground/70">Genre</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GENRES.filter(g => g !== "All genres").map(g => (
              <Button key={g} type="button" onClick={() => setGenre(genre === g ? "" : g)} aria-pressed={genre === g}
                className={`px-3 py-1.5 font-cond font-bold tracking-widest text-[11px] uppercase border ${
                  genre === g ? "text-foreground bg-primary/30 border-primary/40" : "text-foreground/60 border-border/20 bg-card hover:bg-muted"
                }`}>
                {g}
              </Button>
            ))}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="video/*" required aria-label="Video file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-foreground/70 text-sm file:mr-3 file:py-2 file:px-4 file:border-0 file:bg-primary file:text-foreground file:font-cond file:uppercase file:tracking-widest file:text-[10px]" />
        {videoUrl && (
          <div className="space-y-2 border border-border/15 p-3">
            <p className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-foreground/70">Thumbnail</p>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full max-h-56 bg-background"
              controls
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.01)}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              aria-label="Scrub to frame"
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between text-[11px] text-foreground/60 font-cond tracking-widest uppercase">
              <span>{currentTime.toFixed(1)}s / {duration ? duration.toFixed(1) : "—"}s</span>
              <Button type="button" onClick={captureNow} disabled={capturing}
                className="px-3 py-1 border border-border/30 text-foreground hover:bg-primary/30 disabled:opacity-50">
                {capturing ? "Capturing…" : "Capture frame"}
              </Button>
            </div>
            {thumbPreview && (
              <div className="flex items-center gap-3">
                <img src={thumbPreview} alt="Thumbnail preview" className="w-32 aspect-video object-cover border border-border/20" />
                <Button type="button" onClick={() => { if (thumbPreview) URL.revokeObjectURL(thumbPreview); setThumbBlob(null); setThumbPreview(null); }}
                  className="text-[11px] font-cond tracking-widest uppercase text-foreground/60 hover:text-foreground">
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
        {err && <p className="text-primary text-sm">{err}</p>}
        <Button disabled={busy} className="w-full py-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-foreground disabled:opacity-50"
          >
          {busy ? "Uploading…" : "Publish"}
        </Button>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[90svh] overflow-y-auto rounded-lg bg-card border border-border max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <Button type="button" variant="ghost" size="icon" aria-label="Close upload" onClick={onClose} className="absolute right-3 top-3"><X /></Button><h2 className="text-2xl font-semibold mb-5 text-foreground">{title}</h2>
        {children}
      </div>
    </div>
  );
}