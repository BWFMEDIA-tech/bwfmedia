import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  Play, Pause, Heart, Bookmark, Share2, MoreHorizontal,
  BadgeCheck,
  PlayCircle, Sparkles, Flame, Star, Eye, Award, Music2,
  Music, Smile, MapPin, User, Clapperboard, Plus,
  Clock, ListVideo, Settings as SettingsIcon,
  Volume2, Maximize, Shuffle, SkipBack, SkipForward, Repeat,
  Menu, X,
} from "lucide-react";

export const Route = createFileRoute("/videos")({
  component: VideosPage,
  head: () => ({
    meta: [
      { title: "Music Videos & Sponsored Content | BWF Media" },
      { name: "description", content: "Featured music videos and sponsored content from BWF Media artists and partners." },
      { property: "og:title", content: "Music Videos & Sponsored Content | BWF Media TV" },
      { property: "og:description", content: "Featured music videos and sponsored content from BWF Media artists and partners." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://bwfmedia.company/videos" },
    ],
    links: [{ rel: "canonical", href: "https://bwfmedia.company/videos" }],
  }),
});

type VideoRow = {
  id: string;
  user_id: string;
  title: string;
  artist: string | null;
  description: string | null;
  category: "music" | "sponsored";
  storage_path: string;
  external_url: string | null;
  thumbnail_path: string | null;
  created_at: string;
};

function publicUrl(path: string) {
  return supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
}

function thumbUrl(v: { thumbnail_path: string | null }) {
  return v.thumbnail_path ? publicUrl(v.thumbnail_path) : null;
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

const SIDEBAR_PRIMARY = [
  { label: "All Videos", icon: PlayCircle, key: "all" as const },
  { label: "New Releases", icon: Sparkles, key: "new" as const, badge: "NEW" },
  { label: "Trending", icon: Flame, key: "trending" as const },
  { label: "Top Rated", icon: Star, key: "top" as const },
  { label: "Most Viewed", icon: Eye, key: "viewed" as const },
  { label: "Exclusive", icon: Award, key: "exclusive" as const },
  { label: "BWF Originals", icon: Music2, key: "originals" as const },
];

const BROWSE_BY = [
  { label: "Genre", icon: Music },
  { label: "Mood", icon: Smile },
  { label: "Location", icon: MapPin },
  { label: "Artist", icon: User },
  { label: "Director", icon: Clapperboard },
];

const MY_PLAYLISTS = [
  { label: "Watch Later", icon: Clock },
  { label: "Favorites", icon: Heart },
  { label: "My Videos", icon: ListVideo },
];

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function pseudoViews(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 100_000 + (h % 1_400_000);
}
function pseudoDuration(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
  const total = 90 + (h % 240);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [nativeControls, setNativeControls] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playAfterLoadRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setCanUpload(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["artist", "admin"])
      .then(({ data }) => setCanUpload(!!data && data.length > 0));
  }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    setVideos((data as VideoRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const hero = videos[activeIndex] ?? videos[0];
  const trending = videos.slice(0, 5);
  const newReleases = videos.slice(0, 5);
  const videoOfWeek = videos[1] ?? hero;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  useEffect(() => {
    if (videos.length > 0 && activeIndex >= videos.length) setActiveIndex(0);
  }, [activeIndex, videos.length]);

  useEffect(() => {
    const v = videoRef.current;
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    if (!v || !hero) return;
    v.volume = volume;
    v.muted = muted;
    if (playAfterLoadRef.current) {
      playAfterLoadRef.current = false;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [hero?.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [muted, volume]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const selectVideo = (index: number, autoplay = playing) => {
    if (!videos.length) return;
    playAfterLoadRef.current = autoplay;
    setActiveIndex((index + videos.length) % videos.length);
    setQueueOpen(false);
  };

  const nextVideo = (autoplay = playing) => {
    if (!videos.length) return;
    if (shuffleEnabled && videos.length > 1) {
      let next = activeIndex;
      while (next === activeIndex) next = Math.floor(Math.random() * videos.length);
      selectVideo(next, autoplay);
      return;
    }
    selectVideo(activeIndex + 1, autoplay);
  };

  const prevVideo = (autoplay = playing) => {
    const v = videoRef.current;
    if (v && v.currentTime > 3) {
      v.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    selectVideo(activeIndex - 1, autoplay);
  };

  const handleEnded = () => {
    if (repeatEnabled) {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    if (shuffleEnabled || activeIndex < videos.length - 1) nextVideo(true);
    else setPlaying(false);
  };

  const seekVideo = (seconds: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(seconds)) return;
    v.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const changeVolume = (value: number) => {
    const safeValue = Math.min(1, Math.max(0, value));
    setVolume(safeValue);
    const v = videoRef.current;
    if (v) v.volume = safeValue;
    if (safeValue > 0 && muted) {
      setMuted(false);
      if (v) v.muted = false;
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (videoRef.current) videoRef.current.muted = nextMuted;
  };

  const toggleFullscreen = () => {
    const v = videoRef.current as (HTMLVideoElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    const request = v?.requestFullscreen?.bind(v) ?? v?.webkitRequestFullscreen?.bind(v);
    request?.();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* MENU TOGGLE */}
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur flex items-center justify-center text-white"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* BACKDROP */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* SLIDE-IN LEFT SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-72 bg-black border-r border-white/10 overflow-y-auto transition-transform duration-300 ease-out pt-16 px-3 pb-8 space-y-6 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarSection title="Music Videos">
          {SIDEBAR_PRIMARY.map((it) => {
            const Icon = it.icon;
            const active = activeFilter === it.key;
            return (
              <button
                key={it.key}
                onClick={() => { setActiveFilter(it.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-red-500/15 text-red-500 border-l-2 border-red-500"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{it.label}</span>
                {it.badge && (
                  <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">
                    {it.badge}
                  </span>
                )}
              </button>
            );
          })}
        </SidebarSection>

        <SidebarSection title="Browse By">
          {BROWSE_BY.map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
                <Icon size={16} />
                <span>{it.label}</span>
              </button>
            );
          })}
        </SidebarSection>

        <SidebarSection
          title="My Playlists"
          action={<button className="text-red-500 hover:text-red-400"><Plus size={14} /></button>}
        >
          {MY_PLAYLISTS.map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
                <Icon size={16} />
                <span>{it.label}</span>
              </button>
            );
          })}
        </SidebarSection>

        {canUpload && (
          <button
            onClick={() => { setShowUpload(true); setSidebarOpen(false); }}
            className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            <Upload size={14} /> Upload Video
          </button>
        )}
      </aside>

      {/* MAIN LAYOUT */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-8 pt-2 pb-32 grid grid-cols-12 gap-6">
        {/* CENTER */}
        <main className="col-span-12 lg:col-span-9 space-y-8">
          {loading ? (
            <div className="aspect-video bg-white/5 rounded-2xl animate-pulse" />
          ) : hero ? (
            <section>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 group">
                <video
                  ref={videoRef}
                  src={publicUrl(hero.storage_path)}
                  poster={thumbUrl(hero) ?? undefined}
                  preload="metadata"
                  playsInline
                  controls={nativeControls}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                  onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
                  onVolumeChange={(e) => {
                    setVolume(e.currentTarget.volume);
                    setMuted(e.currentTarget.muted);
                  }}
                  onEnded={handleEnded}
                  className="w-full h-full object-cover"
                />
                {!playing && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30"
                    aria-label="Play"
                  >
                    <span className="w-20 h-20 rounded-full border-2 border-white/80 bg-black/40 backdrop-blur flex items-center justify-center hover:scale-105 transition-transform">
                      <Play size={32} className="text-white ml-1" />
                    </span>
                  </button>
                )}
                {/* Progress overlay */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      seekVideo(((e.clientX - rect.left) / rect.width) * duration);
                    }}
                    className="block h-3 w-full py-1 mb-1 cursor-pointer"
                    aria-label="Seek video"
                  >
                    <span className="block h-1 bg-white/20 rounded-full">
                      <span className="block h-full bg-red-500 relative rounded-full" style={{ width: `${progressPercent}%` }}>
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full" />
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>{formatSeconds(currentTime)} / {formatSeconds(duration)}</span>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}><Volume2 size={16} /></button>
                      <button type="button" onClick={() => setNativeControls((v) => !v)} aria-label="Toggle video controls"><SettingsIcon size={16} /></button>
                      <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
                      <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen"><Maximize size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero meta */}
              <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{hero.title}</h1>
                    {hero.category === "sponsored" ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-2 py-1 rounded">
                        Sponsored
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-1 rounded">
                        Exclusive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-white/60">
                    <span className="text-white font-semibold uppercase tracking-wider">{hero.artist ?? "BWF Artist"}</span>
                    <BadgeCheck size={14} className="text-red-500 fill-red-500/20" />
                    <span>·</span>
                    <span>{formatViews(pseudoViews(hero.id))} views</span>
                    <span>·</span>
                    <span>{timeAgo(hero.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ActionPill icon={Heart} label="Like" count="10K" />
                  <ActionPill icon={Bookmark} label="Save" />
                  <ActionPill icon={Share2} label="Share" />
                  <button className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <div className="aspect-video bg-white/5 rounded-2xl flex items-center justify-center text-white/40">
              No videos yet
            </div>
          )}

          {/* TRENDING */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Trending Videos</h2>
              <button className="text-red-500 text-xs font-semibold hover:text-red-400">View All</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {trending.map((v) => (
                <TrendingCard key={v.id} v={v} />
              ))}
              {trending.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-video bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </section>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">New Releases</h3>
              <button className="text-red-500 text-xs font-semibold hover:text-red-400">View All</button>
            </div>
            <div className="space-y-3">
              {newReleases.map((v) => (
                <NewReleaseRow key={v.id} v={v} />
              ))}
              {newReleases.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {videoOfWeek && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-red-500 mb-3">Video of the Week</h3>
              <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
                <Link to="/videos/$id" params={{ id: videoOfWeek.id }} className="block relative aspect-video bg-black group">
                  {thumbUrl(videoOfWeek) ? (
                    <img src={thumbUrl(videoOfWeek)!} alt={videoOfWeek.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <video src={publicUrl(videoOfWeek.storage_path)} preload="metadata" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40">
                    <span className="w-14 h-14 rounded-full bg-black/50 border-2 border-white/80 flex items-center justify-center">
                      <Play size={20} className="text-white ml-0.5" />
                    </span>
                  </div>
                </Link>
                <div className="p-4">
                  <h4 className="font-bold text-lg">{videoOfWeek.title}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 text-sm text-white/60">
                      <span className="uppercase tracking-wider font-semibold text-white/80">{videoOfWeek.artist ?? "BWF"}</span>
                      <BadgeCheck size={12} className="text-red-500" />
                    </div>
                    <Link
                      to="/videos/$id"
                      params={{ id: videoOfWeek.id }}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                    >
                      Watch Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* BOTTOM NOW PLAYING BAR */}
      {hero && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur-xl border-t border-white/10">
          {queueOpen && (
            <div className="absolute bottom-full right-4 mb-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-black/95 p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Video Queue</p>
                <button type="button" onClick={() => setQueueOpen(false)} className="text-xs text-white/50 hover:text-white">Close</button>
              </div>
              {videos.map((v, index) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVideo(index, true)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs ${index === activeIndex ? "bg-red-500/15 text-red-300" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                >
                  <span className="w-5 text-white/30 tabular-nums">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{v.title}</span>
                    <span className="block truncate text-white/40">{v.artist ?? "BWF"}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-24 flex items-center gap-4">
            <div className="flex items-center gap-3 w-72 shrink-0">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-red-500/40 to-red-900/40 border border-white/10 shrink-0 flex items-center justify-center">
                <Music2 size={20} className="text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{hero.title}</p>
                <p className="text-xs text-white/50 uppercase tracking-wider truncate">{hero.artist ?? "BWF"}</p>
              </div>
              <button className="text-white/60 hover:text-red-500 shrink-0"><Heart size={18} /></button>
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="flex items-center gap-5">
                <button type="button" onClick={() => setShuffleEnabled((v) => !v)} aria-label="Shuffle" className={shuffleEnabled ? "text-red-500" : "text-white/60 hover:text-white"}><Shuffle size={16} /></button>
                <button type="button" onClick={() => prevVideo()} aria-label="Previous video" className="text-white/80 hover:text-white"><SkipBack size={20} /></button>
                <button onClick={togglePlay} className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center">
                  {playing ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
                </button>
                <button type="button" onClick={() => nextVideo()} aria-label="Next video" className="text-white/80 hover:text-white"><SkipForward size={20} /></button>
                <button type="button" onClick={() => setRepeatEnabled((v) => !v)} aria-label="Repeat video" className={repeatEnabled ? "text-red-500" : "text-white/60 hover:text-white"}><Repeat size={16} /></button>
              </div>
              <div className="w-full max-w-2xl flex items-center gap-3 text-[11px] text-white/50">
                <span className="w-9 text-right tabular-nums">{formatSeconds(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || currentTime)}
                  onChange={(e) => seekVideo(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer accent-red-500"
                  aria-label="Seek video"
                />
                <span className="w-9 tabular-nums">{formatSeconds(duration)}</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 w-56 shrink-0 justify-end">
              <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className={muted ? "text-red-500" : "text-white/60 hover:text-white"}><Volume2 size={16} /></button>
              <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => changeVolume(Number(e.target.value))} className="h-1 w-24 cursor-pointer accent-red-500" aria-label="Volume" />
              <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className="text-white/60 hover:text-white"><Maximize size={16} /></button>
              <button type="button" onClick={() => setQueueOpen((v) => !v)} aria-label="Video queue" className={queueOpen ? "text-red-500" : "text-white/60 hover:text-white"}><ListVideo size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showUpload && userId && (
        <UploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

function SidebarSection({
  title, children, action,
}: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">{title}</h3>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ActionPill({ icon: Icon, label, count }: { icon: any; label: string; count?: string }) {
  return (
    <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-lg text-sm">
      <Icon size={15} />
      <span>{label}</span>
      {count && <span className="text-white/50 text-xs ml-1">{count}</span>}
    </button>
  );
}

function TrendingCard({ v }: { v: VideoRow }) {
  return (
    <Link to="/videos/$id" params={{ id: v.id }} className="group block">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-white/5 group-hover:border-red-500/50 transition-colors">
        <video src={publicUrl(v.storage_path)} preload="metadata" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center transition-colors">
          <span className="w-10 h-10 rounded-full bg-black/50 border border-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play size={14} className="text-white ml-0.5" />
          </span>
        </div>
        <span className="absolute bottom-2 right-2 text-[10px] bg-black/80 px-1.5 py-0.5 rounded font-medium">
          {pseudoDuration(v.id)}
        </span>
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate group-hover:text-red-400">{v.title}</p>
          <p className="text-[11px] uppercase tracking-wider text-white/50 mt-0.5 truncate">{v.artist ?? "BWF"}</p>
          <p className="text-[11px] text-white/40 mt-1">
            {formatViews(pseudoViews(v.id))} views · {timeAgo(v.created_at)}
          </p>
        </div>
        <button className="text-white/40 hover:text-white shrink-0"><MoreHorizontal size={14} /></button>
      </div>
    </Link>
  );
}

function NewReleaseRow({ v }: { v: VideoRow }) {
  return (
    <Link to="/videos/$id" params={{ id: v.id }} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
      <div className="relative w-20 h-14 rounded-md overflow-hidden bg-black shrink-0 border border-white/5">
        <video src={publicUrl(v.storage_path)} preload="metadata" className="w-full h-full object-cover" />
        <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/80 px-1 rounded">{pseudoDuration(v.id)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate group-hover:text-red-400">{v.title}</p>
        <div className="flex items-center gap-1 text-[11px] text-white/50 uppercase tracking-wider mt-0.5">
          <span className="truncate">{v.artist ?? "BWF"}</span>
          <BadgeCheck size={10} className="text-red-500 shrink-0" />
        </div>
      </div>
    </Link>
  );
}

/* ---------- Auth Modal ---------- */
function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/videos` } });
    const { error } = await fn;
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onClose();
  };

  return (
    <Modal onClose={onClose} title={mode === "signin" ? "Admin Sign In" : "Create Admin Account"}>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email" required aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none"
        />
        <input
          type="password" required minLength={6} aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 chars)"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none"
        />
        {err && <p className="text-blood text-sm">{err}</p>}
        <button
          disabled={busy}
          className="w-full py-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone disabled:opacity-50"
          style={{ backgroundColor: "var(--blood)" }}
        >
          {busy ? "…" : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
        <button
          type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-bone/60 text-sm hover:text-bone"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </Modal>
  );
}

/* ---------- Upload Modal ---------- */
function UploadModal({ userId, onClose, onUploaded }: { userId: string; onClose: () => void; onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [category, setCategory] = useState<"music" | "sponsored">("music");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr("Pick a video file"); return; }
    setBusy(true); setErr(null);
    const ext = file.name.split(".").pop() || "mp4";
    const stamp = Date.now();
    const path = `${userId}/${stamp}.${ext}`;
    const up = await supabase.storage.from("videos").upload(path, file, { contentType: file.type });
    if (up.error) { setErr(up.error.message); setBusy(false); return; }

    // Auto-generate a thumbnail by grabbing a frame from the uploaded video
    let thumbnail_path: string | null = null;
    try {
      const thumbBlob = await captureVideoThumbnail(file);
      if (thumbBlob) {
        const tPath = `${userId}/${stamp}-thumb.jpg`;
        const tUp = await supabase.storage.from("videos").upload(tPath, thumbBlob, { contentType: "image/jpeg" });
        if (!tUp.error) thumbnail_path = tPath;
      }
    } catch { /* non-fatal */ }

    const ins = await supabase.from("videos").insert({
      user_id: userId, title, artist: artist || null, description: description || null,
      category, storage_path: path, external_url: externalUrl || null,
      thumbnail_path,
    });
    setBusy(false);
    if (ins.error) { setErr(ins.error.message); return; }
    onUploaded();
  };

  return (
    <Modal onClose={onClose} title="Upload Video">
      <form onSubmit={submit} className="space-y-4">
        <input required aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none" />
        <input aria-label="Artist or sponsor" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist / Sponsor"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none" />
        <textarea aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3}
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none" />
        <input type="url" aria-label="External link" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="External link (YouTube, Spotify, sponsor URL…)"
          className="w-full bg-black/60 border border-bone/20 px-4 py-3 text-bone focus:border-blood outline-none" />
        <div className="flex gap-2">
          {(["music", "sponsored"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={`flex-1 py-2 font-cond font-bold tracking-[0.25em] text-[11px] uppercase border ${
                category === c ? "text-bone bg-blood/30" : "text-bone/60 border-bone/20"
              }`}
              style={category === c ? { borderColor: "var(--blood)" } : undefined}>
              {c === "music" ? "Music Video" : "Sponsored"}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="video/*" required aria-label="Video file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-bone/70 text-sm file:mr-3 file:py-2 file:px-4 file:border-0 file:bg-blood file:text-bone file:font-cond file:uppercase file:tracking-widest file:text-[10px]" />
        {err && <p className="text-blood text-sm">{err}</p>}
        <button disabled={busy} className="w-full py-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone disabled:opacity-50"
          style={{ backgroundColor: "var(--blood)" }}>
          {busy ? "Uploading…" : "Publish"}
        </button>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-black border border-blood/40 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl uppercase mb-5 text-bone">{title}</h2>
        {children}
      </div>
    </div>
  );
}