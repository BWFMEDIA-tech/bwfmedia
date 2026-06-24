import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Search,
  Pencil,
  Star,
  Users,
  ArrowRight,
  Mic,
  Play,
  Music,
  Radio,
  BarChart3,
  Compass,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import discoverHero from "@/assets/discover-hero.jpg";
import { getHomepageData } from "@/lib/homepage.functions";
import { SignedImg } from "@/components/ui/signed-img";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — BWF Network" },
      {
        name: "description",
        content:
          "Browse, sign, get featured, and collaborate across the BWF Network. Everything you need to build your music career in one place.",
      },
      { property: "og:title", content: "Discover — BWF Network" },
      {
        property: "og:description",
        content: "The next starts here. Browse, sign, get featured, and collab across the BWF Network.",
      },
    ],
  }),
  component: DiscoverPage,
});

/* ---------- small helpers ---------- */

function ActionPill({
  icon: Icon,
  label,
  sub,
}: {
  icon: any;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="w-9 h-9 grid place-items-center rounded-md border border-blood/40 bg-blood/10 text-blood">
        <Icon size={16} />
      </div>
      <div className="font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone">
        {label}
      </div>
      <div className="text-[11px] text-bone/55">{sub}</div>
    </div>
  );
}

function PathCard({
  title,
  blurb,
  children,
  cta,
  to,
  tone = "ghost",
}: {
  title: string;
  blurb: string;
  children?: React.ReactNode;
  cta: string;
  to: string;
  tone?: "blood" | "ghost";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col rounded-2xl border border-white/10 bg-[#0d0d18]/85 backdrop-blur p-6 hover:border-blood/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-xl md:text-2xl uppercase text-bone">{title}</h3>
        <span className="w-8 h-8 grid place-items-center rounded-full bg-blood text-white">
          <ArrowRight size={14} />
        </span>
      </div>
      <p className="text-sm text-bone/65 leading-relaxed">{blurb}</p>
      <div className="flex-1 my-5">{children}</div>
      <RouterLink
        to={to}
        className={`mt-auto w-full inline-flex items-center justify-center px-4 py-3 font-cond font-bold tracking-[0.2em] text-[11px] uppercase rounded-md transition-colors ${
          tone === "blood"
            ? "bg-blood text-white hover:bg-blood-glow"
            : "border border-white/15 bg-white/[0.03] text-bone hover:bg-white/[0.08]"
        }`}
      >
        {cta}
      </RouterLink>
    </motion.div>
  );
}

function ArtistAvatar({ name, role, src }: { name: string; role: string; src?: string | null }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blood/40 bg-gradient-to-br from-[#2a0a10] to-[#0d0d18]">
        {src ? (
          <SignedImg src={src} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="mt-2 font-cond font-bold text-[11px] uppercase tracking-wider text-bone">
        {name}
      </div>
      <div className="text-[10px] text-bone/50">{role}</div>
    </div>
  );
}

function NetworkTile({
  label,
  blurb,
  icon: Icon,
  to,
}: {
  label: string;
  blurb: string;
  icon: any;
  to: string;
}) {
  return (
    <RouterLink
      to={to}
      className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d0d18] p-5 min-h-[170px] overflow-hidden hover:border-blood/50 transition-colors"
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, rgba(225,29,42,0.35), transparent 60%)",
        }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="font-display text-[10px] tracking-[0.3em] text-bone/40 uppercase">BWF</div>
          <div className="font-display text-lg uppercase text-bone leading-tight">{label}</div>
        </div>
        <Icon size={20} className="text-blood" />
      </div>
      <div className="relative">
        <p className="text-xs text-bone/60 mb-3 line-clamp-2">{blurb}</p>
        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blood/15 border border-blood/30 text-blood text-[10px] font-bold tracking-widest uppercase rounded">
          Explore <ArrowRight size={11} />
        </span>
      </div>
    </RouterLink>
  );
}

/* ---------- page ---------- */

function DiscoverPage() {
  const fetchHomepage = useServerFn(getHomepageData);
  const { data } = useQuery({
    queryKey: ["homepage"],
    queryFn: () => fetchHomepage(),
    staleTime: 60_000,
  });
  const artists = data?.featuredArtists ?? [];
  const videos = data?.videos ?? [];

  const browseArtists = artists.slice(0, 3);
  const featured = artists.slice(0, 3);

  return (
    <div
      className="relative min-h-screen text-bone pt-20 md:pt-24"
      style={{
        backgroundColor: "#050505",
        backgroundImage: [
          "radial-gradient(ellipse 70% 50% at 15% 0%, rgba(225,29,42,0.18), transparent 60%)",
          "linear-gradient(180deg, #050505 0%, #0a0203 50%, #050505 100%)",
        ].join(","),
      }}
    >
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-14">
        <div className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood mb-4">
          Discover
        </div>
        <div className="grid lg:grid-cols-[1.1fr_1fr_0.9fr] gap-8 items-start">
          {/* Left: headline + quick actions */}
          <div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl uppercase text-bone leading-[0.9]">
              The Next
              <br />
              Starts{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-blood)" }}
              >
                Here
              </span>
              <span className="text-blood">.</span>
            </h1>
            <p className="mt-5 text-bone text-base md:text-lg font-semibold">
              Browse. Sign. Get Featured. Collab.
            </p>
            <p className="mt-2 text-bone/60 text-sm max-w-md">
              Everything you need to build your career across the BWF Network.
            </p>
            <div className="mt-8 grid grid-cols-4 gap-4 max-w-md">
              <ActionPill icon={Search} label="Browse" sub="Find new talent" />
              <ActionPill icon={Pencil} label="Sign" sub="Join the movement" />
              <ActionPill icon={Star} label="Featured" sub="Get in the spotlight" />
              <ActionPill icon={Users} label="Collab" sub="Create together" />
            </div>
          </div>

          {/* Center: hero portrait */}
          <div className="relative rounded-2xl overflow-hidden border border-blood/30 aspect-[4/5] lg:aspect-auto lg:h-[460px]">
            <img
              src={discoverHero}
              alt="Featured BWF Network artist"
              className="absolute inset-0 w-full h-full object-cover"
              width={1280}
              height={1280}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          </div>

          {/* Right: profile release CTA */}
          <aside className="rounded-2xl border border-white/10 bg-[#0d0d18]/85 backdrop-blur p-6 lg:mt-6">
            <div className="font-display text-xl uppercase text-bone leading-tight">
              BWF Profile
              <br />
              Release
            </div>
            <p className="mt-3 text-sm text-bone/70 leading-relaxed">
              Drop your profile.
              <br />
              Share your voice.
              <br />
              The world is listening.
            </p>
            <RouterLink
              to="/signup"
              className="mt-5 inline-flex items-center justify-center w-full px-4 py-3 bg-blood text-white font-cond font-bold tracking-[0.2em] text-[11px] uppercase rounded-md hover:bg-blood-glow transition-colors"
            >
              Create Your Profile
            </RouterLink>
            <div className="mt-3 text-[11px] text-bone/50 text-center">
              It's free to get started.
            </div>
          </aside>
        </div>
      </section>

      {/* FOUR PATHWAYS */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PathCard
            title="Browse"
            blurb="Explore new artists and discover your next favorite."
            to="/artists"
            cta="Browse Artists"
          >
            {browseArtists.length > 0 ? (
              <div className="flex justify-around">
                {browseArtists.map((a: any) => (
                  <ArtistAvatar
                    key={a.id}
                    name={(a.stage_name || a.display_name || "Artist").toUpperCase()}
                    role={a.bio?.split("·")[0]?.trim().slice(0, 20) || "Artist"}
                    src={a.avatar_url}
                  />
                ))}
              </div>
            ) : (
              <div className="flex justify-around opacity-50">
                {["LANA JAE", "YUNG PRIME", "MILES V"].map((n) => (
                  <ArtistAvatar key={n} name={n} role="Artist" />
                ))}
              </div>
            )}
          </PathCard>

          <PathCard
            title="Sign"
            blurb="Join the BWF Network and start your journey."
            to="/signup"
            cta="Sign Up Now"
            tone="blood"
          >
            <div className="h-full grid place-items-center">
              <div className="w-24 h-24 rounded-full border-2 border-blood grid place-items-center shadow-[0_0_40px_-8px_rgba(225,29,42,0.6)]">
                <Pencil size={36} className="text-blood" />
              </div>
            </div>
          </PathCard>

          <PathCard
            title="Featured Artists"
            blurb="Spotlighting the next wave of rising talent."
            to="/artists"
            cta="View Featured"
          >
            {featured.length > 0 ? (
              <div className="flex justify-around">
                {featured.map((a: any) => (
                  <ArtistAvatar
                    key={a.id}
                    name={(a.stage_name || a.display_name || "Artist").toUpperCase()}
                    role={a.bio?.split("·")[0]?.trim().slice(0, 20) || "Artist"}
                    src={a.avatar_url}
                  />
                ))}
              </div>
            ) : (
              <div className="flex justify-around opacity-50">
                {["JAYLA MARIE", "TRU LEGEND", "KAY SOUL"].map((n) => (
                  <ArtistAvatar key={n} name={n} role="Artist" />
                ))}
              </div>
            )}
          </PathCard>

          <PathCard
            title="Collab"
            blurb={`Connect. Create.\nElevate.`}
            to="/artists"
            cta="Find Collaborators"
            tone="blood"
          >
            <div className="h-full grid place-items-center">
              <div className="w-24 h-24 rounded-full border-2 border-blood grid place-items-center shadow-[0_0_40px_-8px_rgba(225,29,42,0.6)]">
                <Users size={36} className="text-blood" />
              </div>
            </div>
          </PathCard>
        </div>
      </section>

      {/* ACROSS THE NETWORK */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-cond font-bold tracking-[0.3em] text-sm md:text-base uppercase text-bone">
            Across The BWF Network
          </h2>
          <RouterLink
            to="/"
            className="hidden md:inline-flex items-center gap-1 text-blood text-xs font-bold tracking-widest uppercase hover:gap-2 transition-all"
          >
            View All Platforms <ArrowRight size={12} />
          </RouterLink>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <NetworkTile label="Play Arena" blurb="Compete. Perform. Win." icon={Music} to="/play" />
          <NetworkTile
            label="Live Shows"
            blurb="Live performances from top artists."
            icon={Radio}
            to="/live"
          />
          <NetworkTile label="Radio" blurb="Music. Culture. 24/7." icon={Mic} to="/play" />
          <NetworkTile
            label="Charts"
            blurb="See what's trending across the network."
            icon={BarChart3}
            to="/dashboard"
          />
          <NetworkTile
            label="Browse"
            blurb="Find music, artists and more."
            icon={Compass}
            to="/artists"
          />
        </div>
      </section>

      {/* LATEST PROFILE RELEASES */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-cond font-bold tracking-[0.3em] text-sm md:text-base uppercase text-bone">
            Latest Profile Releases
          </h2>
          <RouterLink
            to="/videos"
            className="hidden md:inline-flex items-center gap-1 text-blood text-xs font-bold tracking-widest uppercase hover:gap-2 transition-all"
          >
            View All Releases <ArrowRight size={12} />
          </RouterLink>
        </div>
        {videos.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center text-bone/50 text-sm">
            New releases drop weekly. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {videos.slice(0, 5).map((v: any) => (
              <RouterLink
                key={v.id}
                to="/videos/$id"
                params={{ id: v.id }}
                className="group block rounded-xl overflow-hidden border border-white/10 bg-[#0d0d18] hover:border-blood/40 transition-colors"
              >
                <div
                  className="aspect-square w-full bg-cover bg-center relative"
                  style={{
                    backgroundImage: v.thumbnailUrl
                      ? `url(${v.thumbnailUrl})`
                      : "linear-gradient(135deg, #2a0a10, #0d0d18)",
                  }}
                >
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors grid place-items-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 grid place-items-center group-hover:scale-110 transition-transform">
                      <Play size={16} className="text-black ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-semibold text-bone text-sm truncate">{v.title}</div>
                  <div className="text-[10px] text-bone/50 truncate uppercase tracking-widest font-cond">
                    {v.artist || "BWF Artist"}
                  </div>
                </div>
              </RouterLink>
            ))}
          </div>
        )}
      </section>

      {/* MOVEMENT CTA */}
      <section className="relative overflow-hidden border-t border-white/5 mt-8">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 50%, rgba(225,29,42,0.35), transparent 70%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 md:px-12 py-20 md:py-24 text-center">
          <h2 className="font-display text-4xl md:text-5xl uppercase text-bone leading-[0.95]">
            Be Part Of The Movement
          </h2>
          <p className="mt-4 text-bone/70 text-base">
            Join as an artist or a listener and help elevate the culture.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <RouterLink
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-4 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors rounded-md"
            >
              <Mic size={14} /> Join as an Artist
            </RouterLink>
            <RouterLink
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-4 border border-white/20 bg-white/5 text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white/10 transition-colors rounded-md"
            >
              Join as a Listener
            </RouterLink>
          </div>
        </div>
      </section>
    </div>
  );
}