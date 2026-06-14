import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, LogIn, LogOut,
  Play, Pause, Heart, Bookmark, Share2, MoreHorizontal,
  Bell, MessageSquare, Search, ChevronDown, BadgeCheck,
  PlayCircle, Sparkles, Flame, Star, Eye, Award, Music2,
  Music, Smile, MapPin, User, Clapperboard, Plus,
  Clock, ListVideo, Settings as SettingsIcon,
  Volume2, Maximize, Shuffle, SkipBack, SkipForward, Repeat,
} from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";

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
  created_at: string;
};

function publicUrl(path: string) {
  return supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
}

const NAV_LINKS = [
  { label: "Home", to: "/" as const },
  { label: "Play Arena", to: "/play-arena" as const },
  { label: "Live Shows", to: "/live-shows" as const },
  { label: "Discover", to: "/discover" as const },
  { label: "Radio", to: "/radio" as const },
  { label: "Music Videos", to: "/videos" as const, active: true },
  { label: "Charts", to: "/charts" as const },
];

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

function VideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  const hero = videos[0];
  const trending = videos.slice(0, 5);
  const newReleases = videos.slice(0, 5);
  const videoOfWeek = videos[1] ?? hero;

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* TOP NAV */}
      <nav className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center gap-6">
          <Link to="/" className="flex items-center shrink-0">
            <img src={bwfLogo} alt="BWF Network" className="h-10 w-auto object-contain" />
          </Link>
          <div className="hidden lg:flex items-center gap-7 flex-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to as any}
                className={`text-sm font-medium transition-colors relative ${
                  l.active ? "text-red-500" : "text-white/80 hover:text-white"
                }`}
              >
                {l.label}
                {l.active && <span className="absolute -bottom-[22px] left-0 right-0 h-[2px] bg-red-500" />}
              </Link>
            ))}
            <button className="text-sm font-medium text-white/80 hover:text-white flex items-center gap-1">
              Browse <ChevronDown size={14} />
            </button>
          </div>
          <div className="hidden md:flex items-center bg-white/5 rounded-full px-4 py-2 w-72 gap-2 border border-white/5">
            <Search size={16} className="text-white/40" />
            <input
              placeholder="Search music videos, artists..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-white/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 relative">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
              <MessageSquare size={16} />
            </button>
            {userId ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="w-10 h-10 rounded-full border-2 border-red-500 flex items-center justify-center"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="w-10 h-10 rounded-full border-2 border-red-500 flex items-center justify-center"
                title="Sign in"
              >
                <LogIn size={14} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-8 py-6 grid grid-cols-12 gap-6 pb-32">
        {/* LEFT SIDEBAR */}
        <aside className="col-span-12 lg:col-span-2 space-y-6">
          <SidebarSection title="Music Videos">
            {SIDEBAR_PRIMARY.map((it) => {
              const Icon = it.icon;
              const active = activeFilter === it.key;
              return (
                <button
                  key={it.key}
                  onClick={() => setActiveFilter(it.key)}
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
            action={
              <button className="text-red-500 hover:text-red-400"><Plus size={14} /></button>
            }
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
              onClick={() => setShowUpload(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
            >
              <Upload size={14} /> Upload Video
            </button>
          )}
        </aside>

        {/* CENTER */}
        <main className="col-span-12 lg:col-span-7 space-y-8">
          {loading ? (
            <div className="aspect-video bg-white/5 rounded-2xl animate-pulse" />
          ) : hero ? (
            <section>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/5 group">
                <video
                  ref={videoRef}
                  src={publicUrl(hero.storage_path)}
                  poster=""
                  preload="metadata"
                  playsInline
                  controls={playing}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
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
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-red-500 w-1/3 relative">
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span>1:24 / {pseudoDuration(hero.id)}</span>
                    <div className="flex items-center gap-4">
                      <Volume2 size={16} />
                      <SettingsIcon size={16} />
                      <button onClick={togglePlay}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
                      <Maximize size={16} />
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
                  <video src={publicUrl(videoOfWeek.storage_path)} preload="metadata" className="w-full h-full object-cover" />
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
                <button className="text-white/60 hover:text-white"><Shuffle size={16} /></button>
                <button className="text-white/80 hover:text-white"><SkipBack size={20} /></button>
                <button onClick={togglePlay} className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center">
                  {playing ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
                </button>
                <button className="text-white/80 hover:text-white"><SkipForward size={20} /></button>
                <button className="text-white/60 hover:text-white"><Repeat size={16} /></button>
              </div>
              <div className="w-full max-w-2xl flex items-center gap-3 text-[11px] text-white/50">
                <span>1:24</span>
                <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-red-500 relative">
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
                <span>{pseudoDuration(hero.id)}</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 w-56 shrink-0 justify-end">
              <Volume2 size={16} className="text-white/60" />
              <div className="w-24 h-1 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-red-500 relative">
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              </div>
              <button className="text-white/60 hover:text-white"><Maximize size={16} /></button>
              <button className="text-white/60 hover:text-white"><ListVideo size={16} /></button>
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
    const path = `${userId}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("videos").upload(path, file, { contentType: file.type });
    if (up.error) { setErr(up.error.message); setBusy(false); return; }
    const ins = await supabase.from("videos").insert({
      user_id: userId, title, artist: artist || null, description: description || null,
      category, storage_path: path, external_url: externalUrl || null,
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