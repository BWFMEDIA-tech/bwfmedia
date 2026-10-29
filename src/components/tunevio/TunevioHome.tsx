import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Clapperboard,
  Clock,
  Flame,
  Heart,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { getHomeFeed } from "@/lib/home-feed.functions";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
import { supabase } from "@/integrations/supabase/client";
import { useSignedVideoUrl } from "@/lib/video-urls";
import { SignedImg } from "@/components/ui/signed-img";
import { ContentRail, ListSection } from "@/components/tunevio/ContentRail";
import {
  AlbumCard,
  ArtistCard,
  FeaturedCard,
  LiveArenaCard,
  LiveStreamCard,
  PlaylistCard,
  QuickAccessCard,
  TrackCard,
  toPlayerTrack,
} from "@/components/tunevio/cards";

type HomeChip = "all" | "music" | "videos" | "live" | "artists" | "arena";
const HOME_CHIPS: { id: HomeChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "videos", label: "Videos" },
  { id: "live", label: "Live" },
  { id: "artists", label: "Artists" },
  { id: "arena", label: "Arena" },
];

export function TunevioHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-feed"],
    queryFn: () => getHomeFeed(),
    staleTime: 60_000,
  });
  const { data: videos } = useQuery({
    queryKey: ["home-videos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, artist, storage_path, thumbnail_path")
        .order("created_at", { ascending: false })
        .limit(12);
      return (data ?? []) as {
        id: string;
        title: string;
        artist: string | null;
        storage_path: string;
        thumbnail_path: string | null;
      }[];
    },
    staleTime: 60_000,
  });
  const auth = useAuth();
  const player = usePlayer();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<HomeChip>("all");
  const show = (cat: HomeChip) => chip === "all" || chip === cat;

  const feed = data;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const quickAccess = [
    { title: "Liked Songs", icon: <Heart className="h-5 w-5" />, gradient: "bg-secondary", to: "/library" },
    { title: "Recently Played", imageUrl: feed?.discover[0]?.coverUrl ?? null, icon: <Clock className="h-5 w-5" />, gradient: "bg-gradient-to-br from-tv-cyan to-blue-600", section: "jump-back-in" },
    { title: "Daily Mix", imageUrl: feed?.discover[1]?.coverUrl ?? feed?.popular[0]?.coverUrl ?? null, icon: <Sparkles className="h-5 w-5" />, gradient: "bg-secondary", section: "made-for-you" },
    { title: "Trending Now", imageUrl: feed?.trending[0]?.coverUrl ?? null, icon: <Flame className="h-5 w-5" />, gradient: "bg-gradient-to-br from-tv-cyan to-accent", section: "trending" },
    { title: "New Releases", imageUrl: feed?.newReleases[0]?.coverUrl ?? null, icon: <Sparkles className="h-5 w-5" />, gradient: "bg-gradient-to-br from-accent to-tv-cyan", section: "new-releases" },
    { title: "Your Queue", icon: <ListMusic className="h-5 w-5" />, gradient: "bg-secondary", to: "/library" },
    { title: "Following Artists", icon: <Users className="h-5 w-5" />, gradient: "bg-secondary", section: "artists-you-follow" },
    { title: "Play Arena", icon: <Mic2 className="h-5 w-5" />, gradient: "bg-gradient-to-br from-tv-cyan to-accent", to: "/mic-drop" },
  ];

  const playAll = (tracks: { audioUrl: string | null }[] | undefined) => {
    const playable = (tracks ?? []).filter((t) => t.audioUrl) as never[];
    if (!playable.length) return;
    const mapped = (playable as unknown as Parameters<typeof toPlayerTrack>[0][]).map(toPlayerTrack);
    player.play(mapped[0], mapped);
  };

  return (
    <div className="swara-home min-h-screen bg-background text-foreground">
      <div className="flex w-full gap-6 px-4 pb-40 pt-4 sm:px-6 lg:px-8">
        <main className="min-w-0 flex-1 space-y-10">
          {/* Dashboard bar */}
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-tv-line bg-tv-surface/80 p-3 backdrop-blur sm:flex sm:justify-between">
            <form
              className="relative min-w-0 sm:w-full sm:max-w-lg"
              onSubmit={(e) => {
                e.preventDefault();
                void navigate({ to: "/search", search: { q: query } as never });
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to play?"
                aria-label="Search Tunevio"
                className="w-full rounded-full border border-tv-line bg-white/[0.06] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-tv-cyan/60 focus:outline-none"
              />
            </form>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="grid h-10 w-10 place-items-center rounded-full border border-tv-line text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <Bell className="h-4 w-4" />
              </Link>
              {auth.isAuthenticated ? (
                <Link to="/settings" aria-label="Your profile" className="block">
                  {auth.avatarUrl ? (
                    <SignedImg
                      src={auth.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full border border-tv-line object-cover"
                    />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-tv-cyan text-sm font-black text-black">
                      {(auth.displayName || "U").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="rounded-full bg-white px-4 py-2 text-sm font-black text-black transition hover:brightness-90"
                >
                  Sign in
                </Link>
              )}
            </div>
          </header>

          {/* Filter chips */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HOME_CHIPS.map((c) => (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  chip === c.id
                    ? "bg-tv-cyan text-black"
                    : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Charts */}
          {show("music") && (
          <ContentRail
            id="charts"
            title="Tunevio Charts"
            eyebrow="Top of the platform"
            showAllTo="/charts"
            items={(feed?.charts ?? []).map((t, i) => (
              <AlbumCard
                key={t.id}
                track={t}
                queue={feed?.charts}
                badge={
                  <span className="rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-black text-tv-cyan">
                    #{i + 1}
                  </span>
                }
              />
            ))}
          />
          )}

          {/* Discover playlists */}
          {show("music") && (
          <ContentRail
            id="discover"
            title="Playlists for You"
            eyebrow="Curated for the culture"
            showAllTo="/discover"
            size="md"
            items={[
              <PlaylistCard
                key="fresh"
                title="Fresh Finds"
                description="The newest uploads across the network."
                imageUrl={feed?.newReleases[0]?.coverUrl}
                count={feed?.newReleases.length ?? 0}
                onPlay={() => playAll(feed?.newReleases)}
              />,
              <PlaylistCard
                key="hot"
                title="Hot Right Now"
                description="What the platform is spinning today."
                imageUrl={feed?.trending[0]?.coverUrl}
                count={feed?.trending.length ?? 0}
                onPlay={() => playAll(feed?.trending)}
              />,
              <PlaylistCard
                key="top"
                title="Chart Toppers"
                description="Highest rated tracks on Tunevio."
                imageUrl={feed?.charts[0]?.coverUrl}
                count={feed?.charts.length ?? 0}
                onPlay={() => playAll(feed?.charts)}
              />,
              <PlaylistCard
                key="deep"
                title="Deep Cuts"
                description="Hidden gems rotating every 30 minutes."
                imageUrl={feed?.discover[0]?.coverUrl}
                count={feed?.discover.length ?? 0}
                onPlay={() => playAll(feed?.discover)}
              />,
            ]}
          />
          )}

          {/* Music videos */}
          {show("videos") && (
          <ContentRail
            id="music-videos"
            title="Music Videos"
            eyebrow="Watch now"
            showAllTo="/videos"
            size="wide"
            items={(videos ?? []).map((v) => <VideoCard key={v.id} video={v} />)}
          />
          )}

          {/* Popular this week */}
          {show("music") && (
          <ListSection
            id="popular"
            title="Top Songs"
            eyebrow="Most played"
            showAllTo="/charts"
          >
            {(feed?.popular ?? []).slice(0, 10).map((t, i) => (
              <TrackCard key={t.id} track={t} index={i + 1} queue={feed?.popular} />
            ))}
          </ListSection>
          )}

          {/* Quick access bento grid */}
          {chip === "all" && (
          <section className="swara-home-tools">
            <h2 className="mb-3 px-1 text-lg font-black sm:text-xl">Your Tunevio</h2>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {quickAccess.map((q) => (
                <QuickAccessCard
                  key={q.title}
                  title={q.title}
                  icon={q.icon}
                  imageUrl={"imageUrl" in q ? q.imageUrl : undefined}
                  gradient={q.gradient}
                  to={q.to}
                  onClick={q.section ? () => scrollTo(q.section) : undefined}
                  onPlay={
                    q.title === "Trending Now"
                      ? () => playAll(feed?.trending)
                      : q.title === "New Releases"
                        ? () => playAll(feed?.newReleases)
                        : undefined
                  }
                />
              ))}
            </div>
          </section>
          )}

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : null}

          {/* Featured hero */}
          {show("music") && feed?.featured ? <FeaturedCard track={feed.featured} queue={feed.charts} /> : null}

          {/* Live now */}
          {show("live") && (
          <ContentRail
            id="live-now"
            title="Live Right Now"
            eyebrow="On air"
            showAllTo="/live"
            size="wide"
            items={(feed?.liveStreams ?? []).map((s) => <LiveStreamCard key={s.id} stream={s} />)}
          />
          )}

          {/* Play Arena */}
          {show("arena") && (
          <ContentRail
            id="play-arena"
            title="Play Arena Battles"
            eyebrow="Live competition"
            showAllTo="/mic-drop"
            size="lg"
            items={(feed?.battles ?? []).map((b) => <LiveArenaCard key={b.id} battle={b} />)}
          />
          )}

          {/* Trending */}
          {show("music") && (
          <ContentRail
            id="trending"
            title="Trending Now"
            eyebrow="Heating up"
            showAllTo="/charts"
            items={(feed?.trending ?? []).map((t) => (
              <AlbumCard key={t.id} track={t} queue={feed?.trending} />
            ))}
          />
          )}

          {/* Personalized: Jump back in */}
          {show("music") && (
          <PersonalRail
            id="jump-back-in"
            title="Jump Back In"
            eyebrow="Pick up where you left off"
            signedIn={auth.isAuthenticated}
            tracks={feed?.discover ?? []}
          />
          )}

          {/* New releases */}
          {show("music") && (
          <ContentRail
            id="new-releases"
            title="New Releases"
            eyebrow="🆕 Fresh on Tunevio"
            showAllTo="/discover"
            items={(feed?.newReleases ?? []).map((t) => (
              <AlbumCard key={t.id} track={t} queue={feed?.newReleases} />
            ))}
          />
          )}

          {/* Artists you follow / rising */}
          {show("artists") && (
          <ContentRail
            id="artists-you-follow"
            title={auth.isAuthenticated ? "Artists You Follow" : "Artists To Follow"}
            eyebrow="Your people"
            showAllTo="/artists"
            size="md"
            items={(feed?.artists ?? []).map((a) => <ArtistCard key={a.id} artist={a} />)}
          />
          )}

          {/* Made for you */}
          {show("music") && (
          <PersonalRail
            id="made-for-you"
            title="Made For You"
            eyebrow="Personalized"
            signedIn={auth.isAuthenticated}
            tracks={feed?.discover ?? []}
          />
          )}

          {/* Rising artists */}
          {show("artists") && (
          <ContentRail
            id="rising"
            title="Rising Artists"
            eyebrow="Gaining momentum"
            showAllTo="/leaderboard"
            items={(feed?.rising ?? []).map((a) => <ArtistCard key={a.id} artist={a} />)}
          />
          )}

          {/* Boosted */}
          {show("artists") && (
          <ContentRail
            id="boosted"
            title="Boosted Artists"
            eyebrow="Promoted on Tunevio"
            showAllTo="/discover"
            items={(feed?.boosted ?? []).map((t) => (
              <AlbumCard
                key={t.id}
                track={t}
                queue={feed?.boosted}
                badge={
                  <span className="inline-flex items-center gap-1 rounded-full bg-tv-violet px-2 py-0.5 text-[10px] font-black text-white">
                    <Rocket className="h-3 w-3" /> Boosted
                  </span>
                }
              />
            ))}
          />
          )}

          {!isLoading && !feed?.charts.length ? (
            <div className="rounded-2xl border border-tv-line bg-tv-surface p-10 text-center">
              <TrendingUp className="mx-auto h-8 w-8 text-white/30" />
              <p className="mt-3 text-sm font-bold">No music in the catalog yet</p>
              <p className="mt-1 text-sm text-white/50">
                Once artists publish tracks, they'll fill these shelves automatically.
              </p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

/** Rail that needs an account — shows a sign-in prompt for visitors. */
function PersonalRail({
  id,
  title,
  eyebrow,
  signedIn,
  tracks,
}: {
  id: string;
  title: string;
  eyebrow: string;
  signedIn: boolean;
  tracks: import("@/lib/home-feed.functions").FeedTrack[];
}) {
  if (!signedIn) {
    return (
      <section id={id} className="scroll-mt-24">
        <div className="mb-3 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tv-cyan">{eyebrow}</p>
          <h2 className="text-lg font-black sm:text-xl">{title}</h2>
        </div>
        <div className="grid gap-4 rounded-2xl border border-tv-line bg-gradient-to-br from-tv-violet/20 to-tv-cyan/10 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-bold">Sign in to unlock your personal mixes</p>
            <p className="mt-1 text-sm text-white/60">
              Save tracks, follow artists and get recommendations built from what you actually play.
            </p>
          </div>
          <Link
            to="/login"
            className="shrink-0 rounded-full bg-tv-cyan px-6 py-2.5 text-center text-sm font-black text-black transition hover:brightness-110"
          >
            Sign in
          </Link>
        </div>
      </section>
    );
  }
  return (
    <ContentRail
      id={id}
      title={title}
      eyebrow={eyebrow}
      showAllTo="/discover"
      items={tracks.map((t) => (
        <AlbumCard key={t.id} track={t} queue={tracks} />
      ))}
    />
  );
}

type HomeVideo = {
  id: string;
  title: string;
  artist: string | null;
  storage_path: string;
  thumbnail_path: string | null;
};

const PREVIEW_SECONDS = 30;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Music video card — autoplays a muted 30-second preview while on screen,
 * with an elapsed-time badge and mute/play controls. Tapping opens the video page.
 */
function VideoCard({ video }: { video: HomeVideo }) {
  const thumb = useSignedVideoUrl(video.thumbnail_path);
  const src = useSignedVideoUrl(video.storage_path);
  const boxRef = useRef<HTMLDivElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const [activated, setActivated] = useState(false);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Start loading the preview only once the card scrolls near the screen.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setActivated(true);
      },
      { threshold: 0.35, rootMargin: "150px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play while visible, pause when scrolled away.
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    if (inView) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [inView, activated, src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const v = vidRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const v = vidRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <Link
      to="/videos/$id"
      params={{ id: video.id } as never}
      className="group block overflow-hidden rounded-2xl border border-tv-line bg-tv-surface transition hover:border-tv-cyan/50"
    >
      <div ref={boxRef} className="relative aspect-video w-full overflow-hidden bg-black/40">
        {activated && src ? (
          <video
            ref={vidRef}
            src={src}
            poster={thumb ?? undefined}
            preload="auto"
            muted={muted}
            playsInline
            className="h-full w-full object-cover"
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.currentTime >= PREVIEW_SECONDS) {
                v.currentTime = 0;
                setElapsed(0);
              } else {
                setElapsed(v.currentTime);
              }
            }}
          />
        ) : thumb ? (
          <img
            src={thumb}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-white/5">
            <Clapperboard className="h-8 w-8 text-white/20" />
          </div>
        )}
        {/* Elapsed preview time */}
        {activated && src ? (
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white">
            {formatElapsed(elapsed)}
          </span>
        ) : null}
        {/* Preview controls */}
        {activated && src ? (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-2">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute preview" : "Mute preview"}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause preview" : "Play preview"}
              className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </button>
          </div>
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-tv-cyan text-black shadow-lg">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold">{video.title}</p>
        <p className="truncate text-xs text-white/50">{video.artist || "Tunevio"}</p>
      </div>
    </Link>
  );
}
