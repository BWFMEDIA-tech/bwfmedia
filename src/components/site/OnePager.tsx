import { motion, useScroll, useSpring } from "framer-motion";
import { Link as RouterLink } from "@tanstack/react-router";
import {
  Play,
  Mic,
  ArrowRight,
  Check,
  Radio,
  Eye,
  Music,
  Headphones,
  Star,
  Sparkles,
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Music2,
  Calendar,
  PlayCircle,
  Camera,
  ChevronRight,
  Compass,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";
import { getHomepageData } from "@/lib/homepage.functions";
import { CartButton } from "@/components/CartDrawer";

/* ---------- shared ---------- */

function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left pointer-events-none"
      style={{ scaleX, background: "var(--gradient-blood)" }}
    />
  );
}

function SectionHead({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="max-w-3xl mb-10">
      {kicker && (
        <div className="flex items-center gap-3 mb-4">
          <span className="block h-px w-10 bg-blood" />
          <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">{kicker}</span>
        </div>
      )}
      <h2 className="font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95]">{title}</h2>
      {sub && <p className="mt-4 text-bone/60 text-base md:text-lg leading-relaxed">{sub}</p>}
    </div>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
      <Icon className="h-7 w-7 text-blood/70 mb-3" />
      <p className="text-bone/60 text-sm">{text}</p>
    </div>
  );
}

/* ---------- HERO + LIVE PANEL ---------- */

function Hero({ liveStreams }: { liveStreams: any[] }) {
  const feature = liveStreams[0];
  return (
    <section id="top" className="relative w-full overflow-hidden pt-28 pb-12 md:pt-32 md:pb-20">
      <video
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        src={heroRapperVideo.url}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black" />
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(60% 50% at 50% 30%, rgba(225,29,42,0.35), transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Left: marquee hero card */}
        <div className="relative rounded-2xl overflow-hidden border border-blood/30 bg-black/40 backdrop-blur-md min-h-[420px] md:min-h-[480px] flex flex-col justify-end p-6 md:p-10">
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage: feature?.thumbnailUrl
                ? `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%), url(${feature.thumbnailUrl})`
                : "linear-gradient(135deg, rgba(225,29,42,0.18), rgba(0,0,0,0.6))",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blood/90 px-3 py-1 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="font-cond tracking-[0.3em] text-[10px] uppercase text-white font-bold">
              {feature ? "Live Now" : "BWF Network"}
            </span>
          </div>
          {feature ? (
            <>
              <p className="font-cond tracking-[0.3em] text-[11px] uppercase text-blood mb-3">Live in Play Arena</p>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] uppercase text-bone">
                {feature.host?.stage_name || feature.host?.display_name || feature.title}
                <br />
                <span className="inline-flex items-center gap-3">
                  Live
                  <span className="h-3 w-3 rounded-full bg-blood animate-pulse" />
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-bone/75 text-sm md:text-base">
                {feature.title || "Watch the exclusive live session happening right now."}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <RouterLink
                  to="/play/$room"
                  params={{ room: feature.roomName }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors rounded-md"
                >
                  <Play size={14} fill="currentColor" /> Watch Live
                </RouterLink>
                <RouterLink
                  to="/live"
                  className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/25 bg-white/5 text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white/10 transition-colors rounded-md"
                >
                  View Details
                </RouterLink>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] uppercase text-bone">
                Where Culture
                <br />
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-blood)" }}>
                  Goes Live
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-bone/75 text-sm md:text-base">
                Music. Streams. Reviews. The home stage for the next wave of artists.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <RouterLink
                  to="/studio"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors rounded-md"
                >
                  <Camera size={14} /> Book a Shoot
                </RouterLink>
                <RouterLink
                  to="/off-the-block"
                  className="inline-flex items-center gap-2 px-6 py-3.5 border border-blood/40 bg-blood/10 text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood/20 transition-colors rounded-md"
                >
                  Off Da Block <ArrowRight size={14} />
                </RouterLink>
                <RouterLink
                  to="/discover"
                  className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/20 bg-white/5 text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white/10 transition-colors rounded-md"
                >
                  <Compass size={14} /> Discover
                </RouterLink>
              </div>
            </>
          )}

          {feature && (
            <div className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-3 py-1.5 border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-blood animate-pulse" />
              <span className="font-cond text-[11px] uppercase tracking-widest text-bone/80">LIVE</span>
              <span className="text-[11px] text-bone/60 inline-flex items-center gap-1">
                <Eye size={11} /> {feature.viewerCount.toLocaleString()} watching
              </span>
            </div>
          )}
        </div>

        {/* Right: live activity rail */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#0d0d18]/90 backdrop-blur p-5">
            <h3 className="font-bold text-bone mb-4">Live Activity</h3>
            {liveStreams.length === 0 ? (
              <EmptyHint icon={Radio} text="Nothing live right now. Check back soon." />
            ) : (
              <div className="space-y-3">
                {liveStreams.slice(0, 3).map((s) => (
                  <RouterLink
                    key={s.id}
                    to="/play/$room"
                    params={{ room: s.roomName }}
                    className="group flex items-center gap-3 p-2.5 rounded-lg border border-white/5 hover:border-blood/40 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="inline-flex items-center gap-1.5 rounded bg-blood px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
                      LIVE
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-bone group-hover:text-blood-glow">
                        {s.title || "Live session"}
                      </div>
                      <div className="truncate text-[11px] text-bone/50">
                        {s.host?.stage_name || s.host?.display_name || "BWF host"}
                      </div>
                    </div>
                    <span className="text-[11px] text-bone/60 inline-flex items-center gap-1">
                      <Eye size={11} /> {s.viewerCount}
                    </span>
                  </RouterLink>
                ))}
              </div>
            )}
            <RouterLink
              to="/live"
              className="mt-5 block w-full text-center rounded-md bg-blood text-white font-cond font-bold tracking-[0.2em] text-[11px] uppercase py-3 hover:bg-blood-glow transition-colors"
            >
              {liveStreams.length ? "Join Live Session" : "Browse Live Shows"}
            </RouterLink>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d0d18]/90 backdrop-blur p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-bone">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink to="/studio" icon={Camera} label="Book a Shoot" />
              <QuickLink to="/off-the-block" icon={Star} label="Off Da Block" />
              <QuickLink to="/discover" icon={Compass} label="Discover" />
              <QuickLink to="/artists" icon={Headphones} label="Artists" />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <RouterLink
      to={to}
      className="group flex flex-col items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:border-blood/50 hover:bg-blood/5 transition-colors"
    >
      <Icon size={16} className="text-blood" />
      <span className="font-cond font-bold tracking-[0.2em] text-[10px] uppercase text-bone/80 group-hover:text-bone">
        {label}
      </span>
    </RouterLink>
  );
}

/* ---------- SPOTLIGHT (Featured Artists) ---------- */

function Spotlight({ artists }: { artists: any[] }) {
  return (
    <section className="bg-black/40 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-24">
        <Reveal>
          <SectionHead
            kicker="Spotlight"
            title="Rising Voices. Real Stories."
            sub="Discover the independent artists shaping the culture."
          />
        </Reveal>

        {artists.length === 0 ? (
          <EmptyHint
            icon={Sparkles}
            text="No featured artists yet. Join the network to claim your spotlight."
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {artists.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.05}>
                <RouterLink
                  to="/artist/$id"
                  params={{ id: a.id }}
                  className="group block relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d18] hover:border-blood/50 transition-colors"
                >
                  <div
                    className="aspect-[4/5] w-full bg-cover bg-center"
                    style={{
                      backgroundImage: a.avatar_url
                        ? `url(${a.avatar_url})`
                        : "linear-gradient(135deg, #2a0a10, #0d0d18)",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-blood mb-1">Featured Artist</div>
                    <h3 className="font-display text-2xl uppercase text-bone leading-tight">
                      {a.stage_name || a.display_name || "Artist"}
                    </h3>
                    {a.bio && (
                      <p className="mt-2 text-bone/70 text-sm line-clamp-2">{a.bio}</p>
                    )}
                    <div className="mt-4 inline-flex items-center gap-1.5 text-blood text-xs font-bold tracking-widest uppercase group-hover:gap-3 transition-all">
                      View Artist <ChevronRight size={14} />
                    </div>
                  </div>
                </RouterLink>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- MUSIC VIDEOS ---------- */

function VideosRow({ videos }: { videos: any[] }) {
  return (
    <section className="bg-black/40 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-24">
        <div className="flex items-end justify-between mb-8">
          <Reveal>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="block h-px w-10 bg-blood" />
                <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">Music Videos</span>
              </div>
              <h2 className="font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95]">
                Watch. Discover. Support.
              </h2>
            </div>
          </Reveal>
          <RouterLink to="/videos" className="hidden md:inline-flex items-center gap-1 text-blood text-sm font-bold tracking-widest uppercase hover:gap-2 transition-all">
            View All <ChevronRight size={14} />
          </RouterLink>
        </div>

        {videos.length === 0 ? (
          <EmptyHint icon={PlayCircle} text="No music videos uploaded yet." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((v) => (
              <RouterLink
                key={v.id}
                to="/videos/$id"
                params={{ id: v.id }}
                className="group block rounded-xl overflow-hidden border border-white/10 bg-[#0d0d18] hover:border-blood/40 transition-colors"
              >
                <div
                  className="aspect-video w-full bg-cover bg-center relative"
                  style={{
                    backgroundImage: v.thumbnailUrl
                      ? `url(${v.thumbnailUrl})`
                      : "linear-gradient(135deg, #2a0a10, #0d0d18)",
                  }}
                >
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors grid place-items-center">
                    <div className="w-12 h-12 rounded-full bg-blood/90 grid place-items-center group-hover:scale-110 transition-transform">
                      <Play size={18} className="text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-semibold text-bone text-sm truncate">{v.title}</div>
                  <div className="text-[11px] text-bone/50 truncate uppercase tracking-widest font-cond">
                    {v.artist || "BWF Artist"}
                  </div>
                </div>
              </RouterLink>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- BOOK A SHOOT CTA ---------- */

function BookShoot() {
  return (
    <section id="book" className="bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-24 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
        <Reveal>
          <div className="flex items-center gap-3 mb-4">
            <span className="block h-px w-10 bg-blood" />
            <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">Studio</span>
          </div>
          <h2 className="font-display text-4xl md:text-6xl uppercase text-bone leading-[0.95]">
            Book a Shoot.
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-blood)" }}>
              Make the Moment Travel.
            </span>
          </h2>
          <p className="mt-5 text-bone/70 max-w-xl">
            Interviews, music videos, viral clips — production engineered for the algorithm. One shoot, dozens of assets,
            pushed across every major platform.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <RouterLink
              to="/studio"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors rounded-md"
            >
              <Calendar size={14} /> Book a Shoot
            </RouterLink>
            <RouterLink
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/20 text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white/10 transition-colors rounded-md"
            >
              Talk to the Team
            </RouterLink>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative rounded-2xl overflow-hidden border border-blood/30 aspect-[4/3]">
            <video
              src={heroRapperVideo.url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
              <div>
                <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-blood">By Appointment</div>
                <div className="font-display text-2xl uppercase text-bone">BWF Studio</div>
              </div>
              <RouterLink
                to="/studio"
                className="inline-flex items-center gap-1 px-3 py-2 bg-blood text-white text-[11px] font-bold tracking-widest uppercase rounded hover:bg-blood-glow"
              >
                Book <ArrowRight size={12} />
              </RouterLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- SOCIAL STRIP ---------- */

const SOCIALS = [
  { href: "https://youtube.com/@bwfmedia", label: "YouTube", Icon: Youtube },
  { href: "https://instagram.com/bwfmediatv", label: "Instagram", Icon: Instagram },
  { href: "https://tiktok.com/@bwfmediatv", label: "TikTok", Icon: Music2 },
  { href: "https://x.com/bwfmediatv", label: "X / Twitter", Icon: Twitter },
  { href: "https://facebook.com/bwfmediatv", label: "Facebook", Icon: Facebook },
];

function FollowStrip() {
  return (
    <section className="border-t border-blood/20 bg-gradient-to-b from-black to-[#0a0405]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-14 grid md:grid-cols-[1fr_auto] items-center gap-6">
        <div>
          <div className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood mb-2">Follow BWF</div>
          <h3 className="font-display text-3xl md:text-4xl uppercase text-bone leading-tight">
            686M+ Views. 329K+ Subscribers. The culture is here.
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SOCIALS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="w-11 h-11 grid place-items-center rounded-md border border-white/15 text-bone/80 hover:bg-blood hover:border-blood hover:text-white transition-colors"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- BE PART OF THE MOVEMENT ---------- */

function MovementCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/5">
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(225,29,42,0.35), transparent 70%)" }}
      />
      <div className="relative max-w-4xl mx-auto px-6 md:px-12 py-20 md:py-28 text-center">
        <Reveal>
          <h2 className="font-display text-4xl md:text-6xl uppercase text-bone leading-[0.95]">
            Be Part of the Movement
          </h2>
          <p className="mt-5 text-bone/70 text-base md:text-lg">
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
              <Headphones size={14} /> Join as a Listener
            </RouterLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- ROOT ---------- */

export function OnePager() {
  const fetchHomepage = useServerFn(getHomepageData);
  const { data } = useQuery({
    queryKey: ["homepage"],
    queryFn: () => fetchHomepage(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const liveStreams = data?.liveStreams ?? [];
  const featuredArtists = data?.featuredArtists ?? [];
  const videos = data?.videos ?? [];

  return (
    <div
      className="relative min-h-screen text-bone antialiased overflow-hidden"
      style={{
        backgroundColor: "#050505",
        backgroundImage: [
          "radial-gradient(ellipse 70% 50% at 15% 0%, rgba(225,29,42,0.18), transparent 60%)",
          "radial-gradient(ellipse 60% 50% at 90% 100%, rgba(225,29,42,0.10), transparent 60%)",
          "linear-gradient(180deg, #050505 0%, #0a0203 50%, #050505 100%)",
        ].join(","),
      }}
    >
      <div className="relative z-10">
        <ScrollProgress />
        <Hero liveStreams={liveStreams} />
        <Spotlight artists={featuredArtists} />
        <VideosRow videos={videos} />
        <BookShoot />
        <FollowStrip />
        <MovementCTA />
      </div>

      <div
        className="relative h-[2px] z-20"
        style={{ background: "linear-gradient(90deg, transparent, rgba(225,29,42,0.9), transparent)" }}
      />
    </div>
  );
}