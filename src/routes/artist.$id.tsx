import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArtistMerchSection } from "@/components/merch/ArtistMerchSection";
import { useMemo, useState, useEffect } from "react";
import {
  BadgeCheck, MapPin, Music2, Play, Heart, Share2, MoreHorizontal,
  UserPlus, Instagram, Youtube, Twitter, Facebook, Link2,
  ListMusic, ThumbsUp,
  Upload, Image as ImageIcon, FileText, Music, Video as VideoIcon,
  DollarSign as Dollar,
} from "lucide-react";
import { getArtistMeta } from "@/lib/artist-meta.functions";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
import { toast } from "sonner";

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

const SOCIAL_ICONS: Record<string, any> = {
  instagram: Instagram, youtube: Youtube, twitter: Twitter, x: Twitter,
  facebook: Facebook, tiktok: Music2, spotify: Music2, soundcloud: Music2,
  website: Link2,
};

function ArtistProfilePage() {
  const { id } = useParams({ from: "/artist/$id" });
  const { data: meta } = useSuspenseQuery(artistMetaOptions(id));
  const [tip, setTip] = useState<number>(5);
  const { user, isAuthenticated } = useAuth();
  const isOwner = !!user && user.id === id;

  const profileComplete = !!(meta?.name && (meta?.bio || meta?.photo));
  const name = meta?.name?.trim() || (isOwner ? "Your Artist Profile" : "Artist");
  const artist: ArtistView = {
    name,
    handle: "@" + name.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    photo: meta?.photo ?? null,
    banner: meta?.banner ?? null,
  };
  const initials = useMemo(
    () => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
    [name],
  );

  return (
    <div className="min-h-screen bg-[#070708] text-white pb-28">
      <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 min-w-0">
          <HeroBanner
            artist={artist}
            initials={initials}
            location={meta?.location ?? null}
            genre={meta?.genre ?? null}
            memberSince={meta?.memberSince ?? null}
            isOwner={isOwner}
          />
          {isOwner && !profileComplete && <OwnerSetupCard hasPhoto={!!artist.photo} hasBanner={!!artist.banner} hasBio={!!meta?.bio} hasTracks={(meta?.tracks?.length ?? 0) > 0} />}
          {(meta?.bio || (meta?.socials?.length ?? 0) > 0) && (
            <AboutBlock name={artist.name} bio={meta?.bio ?? null} socials={meta?.socials ?? []} />
          )}
          <StatsRow stats={meta?.stats ?? { songs: 0, videos: 0, likes: 0, tipsCents: 0 }} />
          <PopularTracks tracks={meta?.tracks ?? []} isOwner={isOwner} artistName={artist.name} isAuthenticated={isAuthenticated} />
          <MusicVideos videos={meta?.videos ?? []} isOwner={isOwner} />
          <ArtistMerchSection userId={id} />
        </div>
        <aside className="space-y-4">
          <SupportArtist tip={tip} setTip={setTip} />
          {isOwner && <OwnerQuickLinks />}
        </aside>
      </main>
    </div>
  );
}

function HeroBanner({
  artist, initials, location, genre, memberSince, isOwner,
}: {
  artist: ArtistView; initials: string; isOwner: boolean;
  location: string | null; genre: string | null; memberSince: string | null;
}) {
  const memberSinceLabel = memberSince
    ? new Date(memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0606] via-[#0e0e10] to-[#0a0a0c]">
      {artist.banner ? (
        <img src={artist.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      ) : (
        <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(120% 80% at 70% 0%, ${RED}33, transparent 60%)` }} />
      )}
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
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-anton text-4xl md:text-5xl uppercase tracking-tight truncate">{artist.name}</h1>
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
        {isOwner ? (
          <Link to="/settings/artist-info" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white hover:brightness-110 transition" style={{ background: RED, boxShadow: `0 6px 24px ${RED}55` }}>
            Edit Artist Profile
          </Link>
        ) : (
          <>
            <PillButton icon={UserPlus} label="Follow" />
            <PillButton icon={Share2} label="Share" />
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10"><MoreHorizontal className="h-4 w-4" /></button>
          </>
        )}
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

function AboutBlock({ name, bio, socials }: { name: string; bio: string | null; socials: Array<{ provider: string; url: string; handle: string | null }> }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <h2 className="text-lg font-semibold mb-2">About {name}</h2>
      {bio ? (
        <p className="text-sm text-white/70 leading-relaxed max-w-2xl whitespace-pre-wrap">{bio}</p>
      ) : (
        <p className="text-sm text-white/40 italic">No bio yet.</p>
      )}
      {socials.length > 0 && (
        <div className="mt-4 flex items-center gap-3 text-white/60 flex-wrap">
          {socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.provider?.toLowerCase()] ?? Link2;
            return (
              <a key={s.provider + s.url} href={s.url} target="_blank" rel="noopener noreferrer" title={s.handle ?? s.provider} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10 hover:text-white">
                <Icon className="h-4 w-4" />
              </a>
            );
          })}
        </div>
      )}
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

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
function fmtDur(s: number | null) {
  if (!s || s <= 0) return "--:--";
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function PopularTracks({ tracks, isOwner, artistName }: { tracks: Array<{ id: string; title: string; cover_url: string | null; like_count: number; duration_seconds: number | null; audio_url: string | null }>; isOwner: boolean; artistName: string }) {
  const player = usePlayer();
  const playable = tracks.filter((t) => !!t.audio_url).map((t) => ({
    id: t.id,
    title: t.title,
    artist: artistName,
    audioUrl: t.audio_url as string,
    coverUrl: t.cover_url,
    durationSec: t.duration_seconds,
  }));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Tracks</h2>
      </div>
      {tracks.length === 0 ? (
        <div className="py-8 text-center text-sm text-white/50">
          {isOwner ? (
            <>
              <Music className="h-6 w-6 mx-auto mb-2 text-white/40" />
              <p>You haven't uploaded any tracks yet.</p>
              <Link to="/play" className="inline-flex mt-3 items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white" style={{ background: RED }}>
                <Upload className="h-3.5 w-3.5" /> Upload Your First Track
              </Link>
            </>
          ) : (
            <p>No tracks yet.</p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {tracks.map((t, i) => (
            <li key={t.id} className="grid grid-cols-[20px_36px_minmax(0,1fr)_auto] gap-3 items-center py-2 text-sm">
              <span className="text-white/40 text-xs">{i + 1}</span>
              <button
                type="button"
                onClick={() => {
                  if (!t.audio_url) return;
                  const track = { id: t.id, title: t.title, artist: artistName, audioUrl: t.audio_url, coverUrl: t.cover_url, durationSec: t.duration_seconds };
                  if (player.track?.id === t.id) { player.toggle(); } else { player.play(track, playable); }
                }}
                disabled={!t.audio_url}
                aria-label={player.track?.id === t.id && player.isPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                className="group relative h-9 w-9 rounded overflow-hidden bg-gradient-to-br from-zinc-700 to-zinc-900 disabled:opacity-50"
              >
                {t.cover_url && <img src={t.cover_url} alt="" className="h-full w-full object-cover" />}
                {t.audio_url && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-4 w-4 text-white" fill="currentColor" />
                  </span>
                )}
              </button>
              <div className="min-w-0 truncate">{t.title}</div>
              <div className="text-xs text-white/60 flex items-center gap-3">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {fmtNum(t.like_count)}</span>
                <span className="text-white/40">{fmtDur(t.duration_seconds)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MusicVideos({ videos, isOwner }: { videos: Array<{ id: string; title: string; thumbnail_path: string | null; external_url: string | null; created_at: string }>; isOwner: boolean }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Music Videos</h2>
      </div>
      {videos.length === 0 ? (
        <div className="py-8 text-center text-sm text-white/50">
          {isOwner ? (
            <>
              <VideoIcon className="h-6 w-6 mx-auto mb-2 text-white/40" />
              <p>No videos uploaded yet.</p>
            </>
          ) : (
            <p>No videos yet.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {videos.map((v) => (
            <a key={v.id} href={v.external_url ?? "#"} target={v.external_url ? "_blank" : undefined} rel="noopener noreferrer" className="block">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950 group cursor-pointer">
                {v.thumbnail_path && <img src={v.thumbnail_path} alt={v.title} className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 grid place-items-center bg-black/20">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-black/60 backdrop-blur group-hover:scale-110 transition"><Play className="h-4 w-4 fill-current" /></div>
                </div>
              </div>
              <div className="mt-2 text-sm font-medium truncate">{v.title}</div>
              <div className="text-xs text-white/40">{new Date(v.created_at).toLocaleDateString()}</div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function OwnerSetupCard({ hasPhoto, hasBanner, hasBio, hasTracks }: { hasPhoto: boolean; hasBanner: boolean; hasBio: boolean; hasTracks: boolean }) {
  const steps = [
    { done: hasPhoto,  icon: ImageIcon, label: "Upload profile photo", to: "/settings/profile" },
    { done: hasBanner, icon: ImageIcon, label: "Upload banner image",  to: "/settings/profile" },
    { done: hasBio,    icon: FileText,  label: "Add your bio",         to: "/settings/artist-info" },
    { done: hasTracks, icon: Music,     label: "Upload your first track", to: "/play" },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0606] to-[#0e0e10] p-5 md:p-6">
      <h2 className="text-lg font-bold mb-1">Complete Your Artist Profile</h2>
      <p className="text-sm text-white/60 mb-4">Finish setup so fans can discover your work.</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {steps.map((s) => (
          <Link key={s.label} to={s.to} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${s.done ? "border-emerald-500/30 bg-emerald-500/5 text-white/70" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
            <s.icon className="h-4 w-4 shrink-0" style={{ color: s.done ? undefined : RED }} />
            <span className="flex-1">{s.label}</span>
            <span className="text-xs">{s.done ? "✓" : "→"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function OwnerQuickLinks() {
  return (
    <SideCard>
      <h3 className="text-sm font-semibold mb-3">Artist Tools</h3>
      <div className="space-y-2 text-sm">
        <Link to="/settings/artist-info" className="block px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10">Edit artist info</Link>
        <Link to="/settings/profile" className="block px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10">Edit profile & photo</Link>
        <Link to="/play" className="block px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10">Upload a track</Link>
      </div>
    </SideCard>
  );
}

/* ─────────── sidebar ─────────── */

function SideCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur p-4 ${className}`}>{children}</div>;
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


