import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Link as RouterLink } from "@tanstack/react-router";
import {
  Play,
  Mic,
  Film,
  Scissors,
  Camera,
  Share2,
  Globe,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Menu,
  X,
  Check,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Music2,
  Linkedin,
} from "lucide-react";
import { useState, useEffect } from "react";
import bwfLogo from "@/assets/bwf-logo.png";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";

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

/* ---------- nav ---------- */

function Nav() {
  const links: Array<{ href?: string; to?: string; label: string }> = [
    { href: "/#services", label: "Services" },
    { href: "/#why", label: "Why BWF" },
    { href: "/#audience", label: "Audience" },
    { to: "/contact", label: "Contact" },
  ];
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-black/85 border-b border-blood/40"
          : "backdrop-blur bg-black/40 border-b border-white/5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-14 h-14 md:w-16 md:h-16 object-contain" />
        </a>
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) =>
            l.to ? (
              <RouterLink
                key={l.label}
                to={l.to}
                className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
              >
                {l.label}
              </RouterLink>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
              >
                {l.label}
              </a>
            ),
          )}
          <RouterLink
            to="/studio"
            className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
          >
            Studio
          </RouterLink>
          <a
            href="#book"
            className="font-cond font-bold tracking-[0.2em] text-[11px] uppercase px-4 py-2 bg-blood text-white hover:bg-blood-glow transition-colors"
          >
            Book a Shoot
          </a>
        </div>
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 text-bone hover:text-bone/80 transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden border-t border-white/10 bg-black/95 backdrop-blur overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {links.map((l) =>
                l.to ? (
                  <RouterLink
                    key={l.label}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/80 hover:text-bone py-3 border-b border-white/10"
                  >
                    {l.label}
                  </RouterLink>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/80 hover:text-bone py-3 border-b border-white/10"
                  >
                    {l.label}
                  </a>
                ),
              )}
              <RouterLink
                to="/studio"
                onClick={() => setOpen(false)}
                className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/80 hover:text-bone py-3 border-b border-white/10"
              >
                Studio
              </RouterLink>
              <a
                href="#book"
                onClick={() => setOpen(false)}
                className="font-cond font-bold tracking-[0.2em] text-xs uppercase mt-3 px-4 py-3 bg-blood text-white text-center"
              >
                Book a Shoot
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ---------- HERO ---------- */

function Hero() {
  return (
    <section id="top" className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={heroRapperVideo.url}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(60% 50% at 50% 40%, rgba(255,45,45,0.25), transparent 70%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 text-center pt-24 pb-16">
        <Reveal delay={0}>
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-white/15 bg-white/5 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-blood animate-pulse" />
            <span className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/80">BWF Media TV</span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] leading-[0.9] uppercase text-bone">
            Where Culture
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-blood)" }}>
              Goes Viral
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.25}>
          <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-bone/70 leading-relaxed">
            BWF™ turns artists, moments, and movements into global cultural events.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#book"
              className="group inline-flex items-center gap-2 px-7 py-4 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors"
            >
              Book a Shoot
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://youtube.com/@bwfmedia"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 border border-white/20 bg-white/5 backdrop-blur-md text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white/10 transition-colors"
            >
              <Play size={14} fill="currentColor" />
              Watch on YouTube
            </a>
            <RouterLink
              to="/off-the-block"
              className="inline-flex items-center gap-2 px-7 py-4 border border-blood/40 bg-blood/10 backdrop-blur-md text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood/20 transition-colors"
            >
              Off The Block
              <ArrowRight size={14} />
            </RouterLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- SOCIAL PROOF STRIP ---------- */

function ProofStrip() {
  const items = [
    { v: "329,044", l: "Subscribers" },
    { v: "703.9M", l: "Views" },
    { v: "18.3M", l: "Likes" },
    { v: "771,000K", l: "Comments" },
    { v: "3.0M", l: "Shares" },
    { v: "6.6M", l: "Recent Views" },
  ];
  const loop = [...items, ...items];
  return (
    <section className="border-y border-white/10 bg-black overflow-hidden">
      <div className="relative py-8 group">
        <div className="flex gap-16 md:gap-24 animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap w-max">
          {loop.map((it, i) => (
            <div key={i} className="flex items-baseline gap-4 shrink-0">
              <div className="font-display text-3xl md:text-5xl text-bone">{it.v}</div>
              <div className="font-cond tracking-[0.3em] text-[10px] md:text-xs uppercase text-bone/50">{it.l}</div>
              <span className="ml-16 md:ml-24 h-2 w-2 rounded-full bg-blood/70" aria-hidden />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent" />
      </div>
    </section>
  );
}

/* ---------- SECTION SHELL ---------- */

function SectionHead({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="max-w-3xl mb-14">
      {kicker && (
        <div className="flex items-center gap-3 mb-5">
          <span className="block h-px w-10" style={{ backgroundColor: "var(--blood)" }} />
          <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">{kicker}</span>
        </div>
      )}
      <h2 className="font-display text-4xl md:text-6xl uppercase text-bone leading-[0.95]">{title}</h2>
      {sub && <p className="mt-5 text-bone/60 text-base md:text-lg leading-relaxed">{sub}</p>}
    </div>
  );
}

/* ---------- SERVICES ---------- */

function Services() {
  const items = [
    { icon: Mic, title: "Artist Interviews", desc: "Cinematic on-camera conversations engineered to clip and travel." },
    { icon: Film, title: "Music Videos", desc: "Story-driven visuals shot for the algorithm and the timeline." },
    {
      icon: Scissors,
      title: "Viral Clips",
      desc: "One shoot, dozens of vertical assets cut for TikTok, Reels, Shorts.",
    },
    { icon: Camera, title: "Event Coverage", desc: "Live moments captured, edited, and pushed before the night ends." },
    {
      icon: Share2,
      title: "Distribution Engine",
      desc: "Multi-platform release across YouTube, TikTok, Instagram, and Shorts.",
    },
  ];
  return (
    <section id="services" className="bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <Reveal>
          <SectionHead kicker="What We Do" title="Built to Make You Seen." />
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.06}>
              <div className="group relative h-full p-7 bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-blood/60 hover:bg-white/[0.05] transition-all duration-300">
                <div className="w-11 h-11 flex items-center justify-center bg-blood/10 border border-blood/30 mb-5 group-hover:bg-blood group-hover:border-blood transition-colors">
                  <it.icon size={20} className="text-blood group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-cond font-bold tracking-[0.15em] uppercase text-lg text-bone mb-2">{it.title}</h3>
                <p className="text-sm text-bone/60 leading-relaxed">{it.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- WHY BWF ---------- */

function Why() {
  return (
    <section
      id="why"
      className="relative bg-gradient-to-b from-black via-[#0a0000] to-black border-b border-white/10 overflow-hidden"
    >
      <div
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div className="relative max-w-5xl mx-auto px-6 md:px-12 py-28 md:py-40 text-center">
        <Reveal>
          <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">Why BWF</span>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-6 font-display text-4xl md:text-7xl uppercase text-bone leading-[0.95]">
            We don't make content.
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-blood)" }}>
              We build visibility systems.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-8 max-w-2xl mx-auto text-bone/70 text-lg leading-relaxed">
            One shoot becomes a full content cycle across YouTube, TikTok, Instagram, and Shorts. Designed to compound,
            not disappear.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- AUDIENCE ---------- */

function Audience() {
  const regions = [
    { country: "United States", pct: 38 },
    { country: "United Kingdom", pct: 17 },
    { country: "India", pct: 14 },
    { country: "Germany", pct: 9 },
    { country: "Canada", pct: 7 },
    { country: "Rest of World", pct: 15 },
  ];
  return (
    <section id="audience" className="bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32 grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <SectionHead
            kicker="Global Audience"
            title="Built for Global Reach. Not Local Exposure."
            sub="Our audience spans continents. When we publish, the world watches."
          />
          <div className="inline-flex items-center gap-2 text-bone/70">
            <Globe size={18} className="text-blood" />
            <span className="font-cond tracking-[0.25em] text-xs uppercase">Active in 90+ countries</span>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="space-y-5">
            {regions.map((r, i) => (
              <div key={r.country}>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-cond tracking-[0.15em] text-sm uppercase text-bone">{r.country}</span>
                  <span className="font-display text-xl text-blood">{r.pct}%</span>
                </div>
                <div className="h-1 bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${r.pct * 2.5}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full"
                    style={{ background: "var(--gradient-blood)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- CONTENT SYSTEM ---------- */

function ContentSystem() {
  const steps = [
    { n: "01", t: "Shoot", d: "One premium production day." },
    { n: "02", t: "Edit", d: "Hero piece crafted for retention." },
    { n: "03", t: "Clip", d: "Cut into vertical assets per platform." },
    { n: "04", t: "Distribute", d: "Pushed across YouTube, TikTok, IG, Shorts." },
    { n: "05", t: "Repeat", d: "Compound. Optimize. Scale." },
  ];
  return (
    <section className="bg-gradient-to-b from-black to-[#080808] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <Reveal>
          <SectionHead
            kicker="The System"
            title="One Shoot. Multiple Viral Assets."
            sub="A content engine, not a one-off campaign."
          />
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/10 border border-white/10">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="h-full p-6 md:p-8 bg-black hover:bg-white/[0.03] transition-colors">
                <div className="font-display text-3xl text-blood mb-3">{s.n}</div>
                <div className="font-cond font-bold tracking-[0.2em] text-sm uppercase text-bone">{s.t}</div>
                <div className="text-sm text-bone/55 mt-2 leading-relaxed">{s.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PRICING ---------- */

function Pricing() {
  const plans = [
    {
      name: "Basic",
      price: "$400–$600",
      popular: false,
      features: ["1 hour shoot", "1 hero edit", "3 vertical clips", "Single platform release"],
    },
    {
      name: "Standard",
      price: "$700–$1,000",
      popular: true,
      features: ["2 hour shoot", "1 hero edit", "6 vertical clips", "Multi-platform release", "Thumbnail design"],
    },
    {
      name: "Premium",
      price: "$1,200–$2,000",
      popular: false,
      features: [
        "Half-day shoot",
        "Cinematic hero edit",
        "10+ vertical clips",
        "Full distribution push",
        "Performance report",
      ],
    },
    {
      name: "Flagship",
      price: "$1,500–$3,000",
      popular: false,
      features: [
        "Full-day production",
        "Director-led shoot",
        "15+ assets",
        "Featured BWF placement",
        "Strategy session",
      ],
    },
  ];
  return (
    <section id="pricing" className="bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <Reveal>
          <SectionHead
            kicker="Packages"
            title="Pick Your Tier. Go Viral."
            sub="Transparent pricing. No retainers. Production starts within 14 days of booking."
          />
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              <div
                className={`relative h-full flex flex-col p-7 border backdrop-blur-md transition-all duration-300 ${
                  p.popular
                    ? "bg-blood/10 border-blood shadow-[0_20px_60px_-20px_rgba(255,45,45,0.5)]"
                    : "bg-white/[0.03] border-white/10 hover:border-white/30"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blood text-white font-cond font-bold tracking-[0.2em] text-[10px] uppercase">
                    Most Popular
                  </div>
                )}
                <div className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/60">{p.name}</div>
                <div className="mt-3 font-display text-3xl md:text-4xl text-bone">{p.price}</div>
                <ul className="mt-6 space-y-3 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-bone/75">
                      <Check size={14} className="text-blood mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#book"
                  className={`mt-7 inline-flex items-center justify-center px-5 py-3 font-cond font-bold tracking-[0.2em] text-[11px] uppercase transition-colors ${
                    p.popular
                      ? "bg-blood text-white hover:bg-blood-glow"
                      : "border border-white/20 text-bone hover:bg-white/10"
                  }`}
                >
                  Book {p.name}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PODCAST ---------- */

function Podcast() {
  return (
    <section className="bg-gradient-to-br from-[#0c0000] via-black to-[#0a0a0a] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div className="flex items-center gap-3 mb-5">
            <span className="block h-px w-10 bg-blood" />
            <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">Podcast</span>
          </div>
          <h2 className="font-display text-4xl md:text-6xl uppercase text-bone leading-[0.95]">BWF Red Mic</h2>
          <p className="mt-5 text-bone/65 text-lg leading-relaxed max-w-md">
            Unfiltered conversations with the artists shaping culture. Streaming on iHeart and everywhere you listen.
          </p>
          <a
            href="https://www.iheart.com"
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors"
          >
            <Play size={14} fill="currentColor" />
            Listen on iHeart
          </a>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="relative aspect-square max-w-md mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-blood/40 to-transparent blur-2xl" />
            <div className="relative h-full flex flex-col items-center justify-center bg-black border border-blood/30 backdrop-blur-md">
              <div className="w-24 h-24 rounded-full bg-blood/20 border border-blood flex items-center justify-center mb-5">
                <Mic size={40} className="text-blood" />
              </div>
              <div className="font-display text-3xl text-bone uppercase">Red Mic</div>
              <div className="font-cond tracking-[0.3em] text-[11px] uppercase text-bone/50 mt-2">A BWF Production</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- PARTNERSHIPS ---------- */

function Partnerships() {
  const items = [
    { icon: Share2, t: "Content Licensing", d: "License our viral catalog for brand campaigns and platform deals." },
    { icon: TrendingUp, t: "Distribution Deals", d: "Plug into our network and reach 686M+ views with your IP." },
    { icon: DollarSign, t: "Strategic Investment", d: "Partner with BWF on the next era of culture media." },
  ];
  return (
    <section id="partner" className="bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <Reveal>
          <SectionHead kicker="Partnerships" title="Work With BWF." />
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <Reveal key={it.t} delay={i * 0.08}>
              <div className="group h-full p-8 bg-white/[0.03] border border-white/10 backdrop-blur-md hover:border-blood/60 transition-all duration-300">
                <div className="w-12 h-12 flex items-center justify-center bg-blood/10 border border-blood/30 mb-6 group-hover:bg-blood transition-colors">
                  <it.icon size={22} className="text-blood group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-cond font-bold tracking-[0.15em] uppercase text-xl text-bone mb-3">{it.t}</h3>
                <p className="text-sm text-bone/60 leading-relaxed">{it.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ---------- */

function FinalCTA() {
  return (
    <section id="book" className="relative bg-black overflow-hidden">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(255,45,45,0.4), transparent 70%)" }}
      />
      <div className="relative max-w-4xl mx-auto px-6 md:px-12 py-28 md:py-40 text-center">
        <Reveal>
          <h2 className="font-display text-5xl md:text-8xl uppercase text-bone leading-[0.95]">
            Ready to{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-blood)" }}>
              Go Viral?
            </span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 text-bone/70 text-lg max-w-xl mx-auto">The audience is real. The opportunity is now.</p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <RouterLink
              to="/studio"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blood text-white font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood-glow transition-colors"
            >
              Book a Shoot
              <ArrowRight size={16} />
            </RouterLink>
            <RouterLink
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 bg-white/5 backdrop-blur-md text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-white/10 transition-colors"
            >
              Contact Us
            </RouterLink>
            <RouterLink
              to="/off-the-block"
              className="inline-flex items-center gap-2 px-8 py-4 border border-blood/40 bg-blood/10 backdrop-blur-md text-bone font-cond font-bold tracking-[0.2em] text-xs uppercase hover:bg-blood/20 transition-colors"
            >
              Off The Block
              <ArrowRight size={16} />
            </RouterLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */

import { SiteFooter } from "@/components/site/SiteFooter";
import { GrowthShowcase } from "@/components/site/GrowthShowcase";

/* ---------- ROOT ---------- */

export function OnePager() {
  return (
    <div className="min-h-screen bg-black text-bone antialiased">
      <ScrollProgress />
      <Nav />
      <Hero />
      <ProofStrip />
      <Services />
      <Why />
      <Audience />
      <GrowthShowcase />
      <ContentSystem />
      <Podcast />
      <Partnerships />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}
