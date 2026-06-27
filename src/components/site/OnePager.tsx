import { motion, useScroll, useSpring } from "framer-motion";
import { Link as RouterLink } from "@tanstack/react-router";
import {
  Play,
  Mic,
  ArrowRight,
  Check,
  Radio,
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
  Compass,
  ChevronRight,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";
import { getHomepageData } from "@/lib/homepage.functions";
import { CartButton } from "@/components/CartDrawer";
import { PlayArenaIntro } from "@/components/site/PlayArenaIntro";
import { SignedBackground } from "@/components/ui/signed-img";

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
                  <SignedBackground
                    className="aspect-[4/5] w-full bg-cover bg-center"
                    src={a.avatar_url}
                    fallbackBackground="linear-gradient(135deg, #2a0a10, #0d0d18)"
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
            715M+ Views. 332K+ Subscribers. The culture is here.
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
        <PlayArenaIntro />
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