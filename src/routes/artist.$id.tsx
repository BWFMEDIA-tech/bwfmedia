import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArtistMerchSection } from "@/components/merch/ArtistMerchSection";
import { useMemo, useState } from "react";
import {
  BadgeCheck, MapPin, Music2, Play, Pause, Heart, Share2, MoreHorizontal,
  UserPlus, MessageCircle, Instagram, Youtube, Twitter, Facebook, Link2,
  Headphones, ListMusic, Disc3, ThumbsUp, Calendar,
  Search, Bell, MessageSquare, Home, Radio, BarChart3, ChevronDown,
  Shuffle, SkipBack, SkipForward, Repeat, Volume2, ChevronRight,
  TrendingUp, DollarSign, Clock, Plus, ShoppingBag, Send,
  Users, Video as VideoIcon, DollarSign as Dollar,
} from "lucide-react";
import { getArtistMeta } from "@/lib/artist-meta.functions";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";

const artistMetaOptions = (id: string) =>
  queryOptions({
    queryKey: ["artist-meta", id],
    queryFn: () => getArtistMeta({ data: { id } }),
  });

export const Route = createFileRoute("/artist/$id")({
  loader: ({ params }) => getArtistMeta({ data: { id: params.id } }),
  head: ({ params, loaderData }) => {
    const name = loaderData?.name?.trim() || "Artist Profile";
    const title = `${name} — BWF Network`;
    const desc = `Stream ${name}'s music, watch live sessions, support with tips, and join the community on BWF Network — the creator-powered entertainment platform.`;
    const url = `https://bwfnetwork.com/artist/${params.id}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
    ];
    if (loaderData?.photo) {
      meta.push({ property: "og:image", content: loaderData.photo });
      meta.push({ name: "twitter:image", content: loaderData.photo });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name,
            url,
            ...(loaderData?.photo ? { image: loaderData.photo } : {}),
          },
        }),
      }],
    };
  },
  component: ArtistProfilePage,
});

const RED = "#ef2b2b";

type ArtistView = {
  name: string;
  handle: string;
  photo: string | null;
  banner?: string | null;
};

const POPULAR = [
  { n: 1, title: "No Turning Back", streams: "1.2M", likes: "45K", duration: "3:24" },
  { n: 2, title: "Focused",         streams: "875K", likes: "31K", duration: "2:58" },
  { n: 3, title: "On My Way",       streams: "650K", likes: "22K", duration: "3:15" },
  { n: 4, title: "Different Now",   streams: "590K", likes: "19K", duration: "3:02" },
];
const ALBUMS = [
  { title: "No Turning Back", year: 2024, tracks: 14, streams: "128K" },
  { title: "From The Mud",    year: 2023, tracks: 12, streams: "98K" },
  { title: "Better Days",     year: 2022, tracks: 11, streams: "75K" },
  { title: "The Evolution",   year: 2021, tracks: 10, streams: "60K" },
];
const VIDEOS = [
  { title: "No Turning Back", views: "128K", ago: "2 months ago", duration: "3:24" },
  { title: "Focused",         views: "98K",  ago: "4 months ago", duration: "2:58" },
  { title: "On My Way",       views: "75K",  ago: "6 months ago", duration: "3:15" },
  { title: "Different Now",   views: "60K",  ago: "8 months ago", duration: "3:02" },
];
const EVENTS = [
  { name: "BWF Live Concert",      city: "Atlanta, GA",   date: "Jun 21, 2024" },
  { name: "Summer Jam 2024",       city: "Miami, FL",     date: "Jul 13, 2024" },
  { name: "Indie Artist Showcase", city: "Nashville, TN", date: "Aug 03, 2024" },
];
const MERCH = [
  { name: "BWF Hoodie", price: "$49.99" },
  { name: "BWF Tee",    price: "$29.99" },
  { name: "BWF Hat",    price: "$24.99" },
];

function ArtistProfilePage() {
  const { id } = useParams({ from: "/artist/$id" });
  const { data: meta } = useSuspenseQuery(artistMetaOptions(id));
  const [playing, setPlaying] = useState(false);
  const [tip, setTip] = useState<number>(5);

  const name = meta?.name?.trim() || "Artist";
  const artist: ArtistView = {
    name,
    handle: "@" + name.toLowerCase().replace(/[^a-z0-9]+/g, "") + "official",
    photo: meta?.photo ?? null,
    banner: meta?.banner ?? null,
  };
  const initials = useMemo(
    () => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    [name],
  );

  return (
    <div className="min-h-screen bg-[#070708] text-white pb-28">
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 min-w-0">
          <HeroBanner
            artist={artist}
            initials={initials}
            playing={playing}
            setPlaying={setPlaying}
            location={meta?.location ?? null}
            genre={meta?.genre ?? null}
            memberSince={meta?.memberSince ?? null}
          />
          <AboutBlock name={artist.name} />
          <StatsRow stats={meta?.stats ?? { songs: 0, videos: 0, likes: 0, tipsCents: 0 }} />
          <div className="grid gap-6 md:grid-cols-2">
            <LatestRelease setPlaying={setPlaying} playing={playing} />
            <PopularTracks />
          </div>
          <Albums />
          <MusicVideos />
          <ArtistMerchSection userId={id} />
          <UpcomingEvents />
        </div>
        <aside className="space-y-4">
          <LiveActivity />
          <SupportArtist tip={tip} setTip={setTip} />
          <Membership />
          <ArtistDashboard />
          <BookConnect />
          <SocialFeed name={artist.name} handle={artist.handle} />
        </aside>
      </main>
      <BottomPlayer playing={playing} setPlaying={setPlaying} />
    </div>
  );
}

/* ─────────── shell sections ─────────── */

function TopNav() {
  const links = ["Home", "Play Arena", "Live Shows", "Discover", "Radio", "Charts"];
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#070708]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 h-16 flex items-center gap-6">
        <Link to="/" className="font-anton text-lg tracking-tight">
          <span className="text-white">BWF</span>
          <span style={{ color: RED }}> NETWORK</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm text-white/70">
          {links.map((l) => (
            <a key={l} href="#" className="hover:text-white">{l}</a>
          ))}
          <button className="flex items-center gap-1 hover:text-white">Browse <ChevronDown className="h-3.5 w-3.5" /></button>
        </nav>
        <div className="flex-1 max-w-md ml-auto hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              placeholder="Search for songs, artists, shows…"
              className="w-full bg-white/[0.06] border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10"><Bell className="h-4 w-4" /></button>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10"><MessageSquare className="h-4 w-4" /></button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500/40 to-red-500/40 ring-1 ring-white/10 text-xs font-bold">U</div>
        </div>
      </div>
    </header>
  );
}

function HeroBanner({
  artist, initials, playing, setPlaying, location, genre, memberSince,
}: {
  artist: ArtistView; initials: string; playing: boolean; setPlaying: (b: boolean) => void;
  location: string | null; genre: string | null; memberSince: string | null;
}) {
  const memberSinceLabel = memberSince
    ? new Date(memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0606] via-[#0e0e10] to-[#0a0a0c]">
      <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(120% 80% at 70% 0%, ${RED}33, transparent 60%)` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_120%,#000_0%,transparent_50%)]" />
      <div className="relative p-5 md:p-8 grid grid-cols-[minmax(0,1fr)_auto] gap-6 sm:flex sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 items-end gap-5">
          <div className="relative shrink-0">
            <div className="h-28 w-28 md:h-36 md:w-36 rounded-full overflow-hidden ring-4" style={{ borderColor: RED, boxShadow: `0 0 40px ${RED}55`, borderWidth: 0, outline: `3px solid ${RED}` }}>
              {artist.photo ? (
                <img src={artist.photo} alt={artist.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center bg-gradient-to-br from-red-900/60 to-black text-3xl font-black">{initials}</div>
              )}
            </div>
            <BadgeCheck className="absolute bottom-1 right-1 h-6 w-6 text-white fill-[color:var(--bwf-red)]" style={{ ["--bwf-red" as any]: RED }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-anton text-4xl md:text-5xl uppercase tracking-tight truncate">{artist.name}</h1>
              <BadgeCheck className="h-6 w-6 shrink-0" style={{ color: RED }} />
            </div>
            <div className="text-sm text-white/60 mt-1">{artist.handle}</div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
              {location && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" style={{ color: RED }} /> {location}</span>
              )}
              {genre && (
                <span className="flex items-center gap-1"><Music2 className="h-3.5 w-3.5" style={{ color: RED }} /> {genre}</span>
              )}
              {memberSinceLabel && (
                <span className="text-white/50">Member Since {memberSinceLabel}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="relative px-5 md:px-8 pb-5 md:pb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setPlaying(!playing)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white hover:brightness-110 transition"
          style={{ background: RED, boxShadow: `0 6px 24px ${RED}55` }}
        >
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />} Play All
        </button>
        <PillButton icon={UserPlus} label="Follow" />
        <PillButton icon={Heart} label="Favorite" />
        <PillButton icon={Share2} label="Share" />
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10"><MoreHorizontal className="h-4 w-4" /></button>
      </div>
    </section>
  );
}

function PillButton({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function AboutBlock({ name }: { name: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <h2 className="text-lg font-semibold mb-2">About {name}</h2>
      <p className="text-sm text-white/70 leading-relaxed max-w-2xl">
        Independent recording artist focused on creating authentic music that connects with real-life experiences.
        Dedicated to building a community through creativity, consistency, and innovation.
      </p>
      <div className="mt-4 flex items-center gap-3 text-white/60">
        {[Instagram, Music2, Youtube, Twitter, Facebook, Link2].map((Icon, i) => (
          <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10 hover:text-white">
            <Icon className="h-4 w-4" />
          </a>
        ))}
      </div>
    </section>
  );
}

function StatsRow({ stats }: { stats: { songs: number; videos: number; likes: number; tipsCents: number } }) {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  };
  const tips = stats.tipsCents > 0
    ? "$" + (stats.tipsCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "$0";
  const items = [
    { icon: ListMusic,  label: "Songs Uploaded",  value: fmt(stats.songs) },
    { icon: VideoIcon,  label: "Videos",          value: fmt(stats.videos) },
    { icon: ThumbsUp,   label: "Likes Received",  value: fmt(stats.likes) },
    { icon: Dollar,     label: "Tips Received",   value: tips },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <s.icon className="h-4 w-4 shrink-0" style={{ color: RED }} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/50 truncate">{s.label}</div>
            <div className="text-lg font-bold leading-tight">{s.value}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function LatestRelease({ playing, setPlaying }: { playing: boolean; setPlaying: (b: boolean) => void }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-base font-semibold mb-4">Latest Release</h2>
      <div className="flex gap-4">
        <div className="aspect-square w-32 md:w-40 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br from-red-900 to-black grid place-items-center">
          <div className="font-anton text-bone text-xs uppercase tracking-widest text-white/80 text-center px-2">No Turning<br />Back</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold flex items-center gap-2 truncate">
            No Turning Back
            <span className="text-[10px] px-1 bg-white/15 rounded">E</span>
          </div>
          <div className="text-xs text-white/60 mt-0.5">JAY TRU</div>
          <div className="mt-3 space-y-1.5 text-xs text-white/70">
            <div className="flex items-center gap-2"><Play className="h-3.5 w-3.5" style={{ color: RED }} /> 128K Streams</div>
            <div className="flex items-center gap-2"><Heart className="h-3.5 w-3.5" style={{ color: RED }} /> 8.4K Likes</div>
            <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" style={{ color: RED }} /> May 10, 2024</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setPlaying(!playing)} className="px-4 py-2 rounded-full text-xs font-semibold text-white hover:brightness-110" style={{ background: RED }}>
              Listen Now
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}</button>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PopularTracks() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Popular Tracks</h2>
        <a className="text-xs hover:underline" style={{ color: RED }}>View All</a>
      </div>
      <ul className="divide-y divide-white/5">
        {POPULAR.map((t) => (
          <li key={t.n} className="grid grid-cols-[20px_36px_minmax(0,1fr)_auto_auto] gap-3 items-center py-2 text-sm">
            <span className="text-white/40 text-xs">{t.n}</span>
            <div className="h-9 w-9 rounded bg-gradient-to-br from-zinc-700 to-zinc-900" />
            <div className="min-w-0 truncate">{t.title}</div>
            <button className="grid h-7 w-7 place-items-center rounded-full bg-white/5 hover:bg-white/10"><Play className="h-3 w-3 fill-current" /></button>
            <div className="text-xs text-white/60 flex items-center gap-3">
              <span>{t.streams}</span>
              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {t.likes}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Albums() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Albums & Projects</h2>
        <a className="text-xs hover:underline" style={{ color: RED }}>View All</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ALBUMS.map((a) => (
          <div key={a.title} className="group">
            <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-red-900/60 to-zinc-900 grid place-items-center mb-2">
              <span className="font-anton uppercase text-xs text-white/80 text-center px-3">{a.title}</span>
            </div>
            <div className="text-sm font-semibold truncate">{a.title}</div>
            <div className="text-xs text-white/50">{a.year} • {a.tracks} Tracks</div>
            <div className="text-xs text-white/50">{a.streams} Streams</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MusicVideos() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Music Videos</h2>
        <a className="text-xs hover:underline" style={{ color: RED }}>View All</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {VIDEOS.map((v) => (
          <div key={v.title}>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950 group cursor-pointer">
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-black/60 backdrop-blur group-hover:scale-110 transition"><Play className="h-4 w-4 fill-current" /></div>
              </div>
              <span className="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/70">{v.duration}</span>
            </div>
            <div className="mt-2 text-sm font-medium truncate">{v.title}</div>
            <div className="text-xs text-white/50">Official Music Video</div>
            <div className="text-xs text-white/40">{v.views} Views • {v.ago}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpcomingEvents() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Upcoming Events</h2>
        <a className="text-xs hover:underline" style={{ color: RED }}>View All</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EVENTS.map((e) => (
          <div key={e.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex gap-3 items-center">
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-red-900 to-black shrink-0 grid place-items-center text-[10px] font-anton uppercase text-white/70">EVENT</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{e.name}</div>
              <div className="text-xs text-white/50">{e.city}</div>
              <div className="text-xs text-white/50 flex items-center gap-1 mt-0.5"><Calendar className="h-3 w-3" /> {e.date}</div>
              <button className="mt-2 w-full px-3 py-1.5 rounded-full text-[11px] font-semibold text-white" style={{ background: RED }}>Get Tickets</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────── sidebar ─────────── */

function SideCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-4 ${className}`}>{children}</div>;
}

function LiveActivity() {
  return (
    <SideCard>
      <h3 className="text-sm font-semibold mb-3">Live Activity</h3>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white" style={{ background: RED }}>
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
        </span>
        <span className="text-xs text-white/70">Live in Play Arena</span>
        <ChevronRight className="h-3 w-3 ml-auto text-white/40" />
      </div>
      <div className="rounded-xl bg-white/5 p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded bg-gradient-to-br from-red-900 to-black shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase text-white/50">Now Playing</div>
          <div className="text-sm font-semibold truncate">No Turning Back</div>
        </div>
        <ChevronRight className="h-3 w-3 text-white/40" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-6 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 ring-2 ring-[#0b0b0d]" />
          ))}
        </div>
        <div className="text-xs text-white/70">Listeners <span className="font-bold text-white">1,284</span></div>
        <div className="ml-auto text-xs text-white/50">+1.1K</div>
      </div>
      <Link to="/play" className="mt-3 block w-full text-center px-4 py-2.5 rounded-full text-sm font-semibold text-white hover:brightness-110" style={{ background: RED }}>
        Join Live Session
      </Link>
    </SideCard>
  );
}

function SupportArtist({ tip, setTip }: { tip: number; setTip: (n: number) => void }) {
  const options = [5, 10, 25];
  return (
    <SideCard>
      <h3 className="text-sm font-semibold mb-3">Support This Artist</h3>
      <div className="grid grid-cols-4 gap-2">
        {options.map((v) => (
          <button
            key={v}
            onClick={() => setTip(v)}
            className={`rounded-lg py-2 text-center border ${tip === v ? "text-white" : "border-white/10 bg-white/5 text-white/80"}`}
            style={tip === v ? { borderColor: RED, background: `${RED}1f` } : undefined}
          >
            <div className="text-sm font-bold" style={tip === v ? { color: RED } : undefined}>${v}</div>
            <div className="text-[10px] text-white/60">Tip</div>
          </button>
        ))}
        <button className="rounded-lg py-2 border border-white/10 bg-white/5 text-white/80 text-center">
          <div className="text-sm font-bold">Other</div>
          <div className="text-[10px] text-white/60">Tip</div>
        </button>
      </div>
    </SideCard>
  );
}

function Membership() {
  const tiers = [
    { name: "Fan",       price: "$4.99",  blurb: "Early releases • Exclusive content" },
    { name: "Super Fan", price: "$9.99",  blurb: "All Fan perks • Behind the scenes" },
    { name: "VIP Fan",   price: "$19.99", blurb: "All perks • Private livestreams • VIP badge" },
  ];
  return (
    <SideCard>
      <h3 className="text-sm font-semibold mb-3">Membership</h3>
      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3">
            <Heart className="h-4 w-4 shrink-0" style={{ color: RED }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{t.name}</span>
                <span className="text-xs text-white/70">{t.price} / month</span>
              </div>
              <div className="text-[11px] text-white/50 truncate">{t.blurb}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 w-full px-4 py-2.5 rounded-full text-sm font-semibold text-white hover:brightness-110" style={{ background: RED }}>
        Join Now
      </button>
    </SideCard>
  );
}

function ArtistDashboard() {
  return (
    <SideCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Artist Dashboard</h3>
        <a className="text-xs hover:underline" style={{ color: RED }}>View Dashboard</a>
      </div>
      <div className="text-xs text-white/60 mb-1">Streams This Month</div>
      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold" style={{ color: RED }}>48.2K</div>
        <span className="text-xs flex items-center gap-1 text-emerald-400"><TrendingUp className="h-3 w-3" /> 18.6%</span>
      </div>
      <svg viewBox="0 0 200 60" className="mt-2 w-full h-14">
        <path d="M0,45 L20,40 L40,42 L60,35 L80,30 L100,32 L120,22 L140,25 L160,18 L180,12 L200,8" fill="none" stroke={RED} strokeWidth="2" />
      </svg>
      <div className="mt-3 space-y-1.5 text-xs">
        <Row icon={DollarSign} label="Revenue Earned"   value="$3,842.75" />
        <Row icon={Clock}      label="Pending Revenue"  value="$1,245.30" />
        <Row icon={Users}      label="Followers Growth" value="+1,245" />
        <Row icon={Music2}     label="Monthly Listeners" value="48,200" />
      </div>
    </SideCard>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-white/70"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function BookConnect() {
  return (
    <SideCard>
      <h3 className="text-sm font-semibold mb-3">Book / Connect</h3>
      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 text-xs">
          <Calendar className="h-3.5 w-3.5" /> Book Artist
        </button>
        <button className="flex items-center justify-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 text-xs">
          <MessageCircle className="h-3.5 w-3.5" /> Message Artist
        </button>
      </div>
    </SideCard>
  );
}

function MerchStore() {
  return (
    <SideCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Merchandise</h3>
        <a className="text-xs hover:underline" style={{ color: RED }}>View Store</a>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MERCH.map((m) => (
          <div key={m.name}>
            <div className="aspect-square rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 grid place-items-center mb-1">
              <ShoppingBag className="h-5 w-5 text-white/40" />
            </div>
            <div className="text-[11px] font-medium truncate">{m.name}</div>
            <div className="text-[10px] text-white/50">{m.price}</div>
          </div>
        ))}
      </div>
    </SideCard>
  );
}

function SocialFeed({ name, handle }: { name: string; handle: string }) {
  return (
    <SideCard>
      <h3 className="text-sm font-semibold mb-3">Social Feed</h3>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-900 to-black shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{name}</span>
            <span className="text-[10px] text-white/40 ml-auto">2h</span>
          </div>
          <div className="text-[11px] text-white/50">{handle}</div>
          <p className="text-xs text-white/80 mt-1">Just dropped a new freestyle in the arena! Tap in now 🔥</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-white/60">
            <button className="flex items-center gap-1 hover:text-white"><Heart className="h-3.5 w-3.5" /> 245</button>
            <button className="flex items-center gap-1 hover:text-white"><MessageCircle className="h-3.5 w-3.5" /> 32</button>
            <Send className="h-3.5 w-3.5 ml-auto" />
          </div>
        </div>
      </div>
    </SideCard>
  );
}

function BottomPlayer({ playing, setPlaying }: { playing: boolean; setPlaying: (b: boolean) => void }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-4 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded bg-gradient-to-br from-red-900 to-black shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">No Turning Back</div>
            <div className="text-xs text-white/50">JAY TRU</div>
          </div>
          <button className="ml-2 text-white/50 hover:text-white"><Heart className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col items-center gap-1 min-w-0 w-full max-w-xl">
          <div className="flex items-center gap-3 text-white/70">
            <button className="hover:text-white"><Shuffle className="h-4 w-4" /></button>
            <button className="hover:text-white"><SkipBack className="h-4 w-4" /></button>
            <button onClick={() => setPlaying(!playing)} className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: RED }}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <button className="hover:text-white"><SkipForward className="h-4 w-4" /></button>
            <button className="hover:text-white"><Repeat className="h-4 w-4" /></button>
          </div>
          <div className="w-full flex items-center gap-2 text-[10px] text-white/50">
            <span>1:24</span>
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-2/5" style={{ background: RED }} />
            </div>
            <span>3:24</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 text-white/60">
          <Volume2 className="h-4 w-4" />
          <div className="hidden sm:block h-1 w-20 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-3/4 bg-white/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

