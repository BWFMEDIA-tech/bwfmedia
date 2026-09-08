import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell,
  Clock,
  Compass,
  Flame,
  Heart,
  Home,
  ListMusic,
  Mic2,
  Radio,
  Rocket,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { getHomeFeed } from "@/lib/home-feed.functions";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
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

const SIDEBAR = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/charts", label: "Charts", icon: Trophy },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/mic-drop", label: "Play Arena", icon: Mic2 },
  { to: "/artists", label: "Artists", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Star },
] as const;

export function TunevioHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-feed"],
    queryFn: () => getHomeFeed(),
    staleTime: 60_000,
  });
  const auth = useAuth();
  const player = usePlayer();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const feed = data;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const quickAccess = [
    { title: "Liked Songs", icon: <Heart className="h-5 w-5" />, gradient: "bg-gradient-to-br from-tv-magenta to-tv-violet", section: "made-for-you" },
    { title: "Recently Played", icon: <Clock className="h-5 w-5" />, gradient: "bg-gradient-to-br from-tv-cyan to-blue-600", section: "jump-back-in" },
    { title: "Daily Mix", icon: <Sparkles className="h-5 w-5" />, gradient: "bg-gradient-to-br from-violet-500 to-fuchsia-600", section: "made-for-you" },
    { title: "Trending Now", icon: <Flame className="h-5 w-5" />, gradient: "bg-gradient-to-br from-orange-500 to-tv-magenta", section: "trending" },
    { title: "New Releases", icon: <Sparkles className="h-5 w-5" />, gradient: "bg-gradient-to-br from-emerald-400 to-tv-cyan", section: "new-releases" },
    { title: "Your Playlists", icon: <ListMusic className="h-5 w-5" />, gradient: "bg-gradient-to-br from-slate-500 to-slate-800", section: "made-for-you" },
    { title: "Following Artists", icon: <Users className="h-5 w-5" />, gradient: "bg-gradient-to-br from-tv-violet to-indigo-700", section: "artists-you-follow" },
    { title: "Play Arena", icon: <Mic2 className="h-5 w-5" />, gradient: "bg-gradient-to-br from-tv-magenta to-red-600", to: "/mic-drop" },
  ];

  const playAll = (tracks: { audioUrl: string | null }[] | undefined) => {
    const playable = (tracks ?? []).filter((t) => t.audioUrl) as never[];
    if (!playable.length) return;
    const mapped = (playable as unknown as Parameters<typeof toPlayerTrack>[0][]).map(toPlayerTrack);
    player.play(mapped[0], mapped);
  };

  return (
    <div className="min-h-screen bg-tv-base text-white">
      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 pb-40 pt-4 sm:px-6 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-[220px] shrink-0 flex-col rounded-2xl border border-tv-line bg-tv-surface p-4 lg:flex">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Browse</p>
          <nav className="mt-3 flex flex-col gap-1">
            {SIDEBAR.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to as never}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
                  activeProps={{ className: "bg-white/10 text-white" }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-xl bg-gradient-to-br from-tv-violet/30 to-tv-cyan/20 p-4">
            <p className="text-sm font-black">Are you an artist?</p>
            <p className="mt-1 text-xs text-white/60">Upload music, go live and get discovered.</p>
            <Link
              to="/artist-submission"
              className="mt-3 inline-block rounded-full bg-white px-3 py-1.5 text-xs font-black text-black"
            >
              Get started
            </Link>
          </div>
        </aside>

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

          {/* Quick access bento grid */}
          <section>
            <h2 className="mb-3 px-1 text-lg font-black sm:text-xl">Good to see you</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {quickAccess.map((q) => (
                <QuickAccessCard
                  key={q.title}
                  title={q.title}
                  icon={q.icon}
                  gradient={q.gradient}
                  to={q.to}
                  onClick={q.section ? () => scrollTo(q.section!) : undefined}
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

          {/* Featured hero */}
          {feed?.featured ? <FeaturedCard track={feed.featured} queue={feed.charts} /> : null}

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : null}

          {/* Live now */}
          <ContentRail
            id="live-now"
            title="Live Right Now"
            eyebrow="🔴 On air"
            showAllTo="/live"
            size="wide"
            items={(feed?.liveStreams ?? []).map((s) => <LiveStreamCard key={s.id} stream={s} />)}
          />

          {/* Play Arena */}
          <ContentRail
            id="play-arena"
            title="Play Arena Battles"
            eyebrow="🎤 Live competition"
            showAllTo="/mic-drop"
            size="lg"
            items={(feed?.battles ?? []).map((b) => <LiveArenaCard key={b.id} battle={b} />)}
          />

          {/* Trending */}
          <ContentRail
            id="trending"
            title="Trending Now"
            eyebrow="🔥 Heating up"
            showAllTo="/charts"
            items={(feed?.trending ?? []).map((t) => (
              <AlbumCard key={t.id} track={t} queue={feed?.trending} />
            ))}
          />

          {/* Personalized: Jump back in */}
          <PersonalRail
            id="jump-back-in"
            title="Jump Back In"
            eyebrow="🎵 Pick up where you left off"
            signedIn={auth.isAuthenticated}
            tracks={feed?.discover ?? []}
          />

          {/* New releases */}
          <ContentRail
            id="new-releases"
            title="New Releases"
            eyebrow="🆕 Fresh on Tunevio"
            showAllTo="/discover"
            items={(feed?.newReleases ?? []).map((t) => (
              <AlbumCard key={t.id} track={t} queue={feed?.newReleases} />
            ))}
          />

          {/* Artists you follow / rising */}
          <ContentRail
            id="artists-you-follow"
            title={auth.isAuthenticated ? "Artists You Follow" : "Artists To Follow"}
            eyebrow="🎤 Your people"
            showAllTo="/artists"
            size="md"
            items={(feed?.artists ?? []).map((a) => <ArtistCard key={a.id} artist={a} />)}
          />

          {/* Popular this week */}
          <ListSection
            id="popular"
            title="Popular This Week"
            eyebrow="🔥 Most played"
            showAllTo="/charts"
          >
            {(feed?.popular ?? []).slice(0, 10).map((t, i) => (
              <TrackCard key={t.id} track={t} index={i + 1} queue={feed?.popular} />
            ))}
          </ListSection>

          {/* Made for you */}
          <PersonalRail
            id="made-for-you"
            title="Made For You"
            eyebrow="🎧 Personalized"
            signedIn={auth.isAuthenticated}
            tracks={feed?.discover ?? []}
          />

          {/* Charts */}
          <ContentRail
            id="charts"
            title="Tunevio Charts"
            eyebrow="🏆 Top of the platform"
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

          {/* Rising artists */}
          <ContentRail
            id="rising"
            title="Rising Artists"
            eyebrow="📈 Gaining momentum"
            showAllTo="/leaderboard"
            items={(feed?.rising ?? []).map((a) => <ArtistCard key={a.id} artist={a} />)}
          />

          {/* Boosted */}
          <ContentRail
            id="boosted"
            title="Boosted Artists"
            eyebrow="🚀 Promoted on Tunevio"
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

          {/* Discover playlists */}
          <ContentRail
            id="discover"
            title="Discover"
            eyebrow="💎 Curated for the culture"
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
