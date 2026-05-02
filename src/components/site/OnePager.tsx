import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import {
  Play, Mic, Film, Smartphone, Flame, TrendingUp, Users,
  DollarSign, Globe, Handshake, Trophy, Sparkles, Mail, Instagram, Youtube, ArrowUpRight,
  Share2, Eye, Heart, Camera, Video, Megaphone, BarChart3, Menu, X, Facebook, Twitter, Music2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import grunge from "@/assets/grunge-bg.jpg";
import bwfLogo from "@/assets/bwf-logo.png";
import camera from "@/assets/camera.png";
import audience from "@/assets/audience.jpg";
import viralThumbs from "@/assets/viral-thumbs.jpg";
import musicVideo from "@/assets/music-video.jpg";
import bwfIntroVideo from "@/assets/bwf-intro.mp4.asset.json";

/* ---------- shared bits ---------- */

function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
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
      className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left pointer-events-none"
      style={{ scaleX, background: "var(--gradient-blood)" }}
    />
  );
}

function Section({
  id,
  label,
  number,
  children,
  className = "",
}: {
  id?: string;
  label?: string;
  number?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative w-full overflow-hidden grunge-overlay border-b border-border ${className}`}
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.92)), url(${grunge})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ backgroundColor: "var(--blood)" }}
      />
      {(label || number) && (
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 flex items-center justify-between">
          {label && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <span
                className="block h-px w-10 section-bar"
                style={{ backgroundColor: "var(--blood)" }}
              />
              <span className="font-cond font-bold tracking-[0.4em] text-xs uppercase" style={{ color: "var(--blood)" }}>
                {number ? `${number} — ${label}` : label}
              </span>
            </motion.div>
          )}

        </div>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {children}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

function StatBlock({ big, label }: { big: string; label: string }) {
  return (
    <div className="text-left">
      <div className="font-display text-4xl md:text-5xl leading-none font-light text-bone/90">{big}</div>
      <div className="font-cond tracking-[0.35em] text-[10px] md:text-xs uppercase text-bone/50 mt-3">{label}</div>
    </div>
  );
}

/* ---------- nav ---------- */

function Nav() {
  const links = [
    { href: "#about", label: "About" },
    { href: "#reach", label: "Reach" },
    { href: "#proof", label: "Proof" },
    { href: "#services", label: "Services" },
    { href: "#engine", label: "Engine" },
    { href: "#audience", label: "Audience" },
    { href: "#revenue", label: "Revenue" },
    { href: "#pricing", label: "Pricing" },
    { href: "#partner", label: "Partner" },
    { href: "#contact", label: "Contact" },
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
        scrolled ? "backdrop-blur-xl bg-black/85 border-b border-blood/40" : "backdrop-blur bg-black/40 border-b border-border"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media" className="w-16 h-16 md:w-20 md:h-20 object-contain" />
        </a>
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/70 hover:text-bone transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/deck"
            className="font-cond font-bold tracking-[0.25em] text-[11px] uppercase hover:text-bone transition-colors"
            style={{ color: "var(--blood)" }}
          >
            Pitch Deck
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#contact"
            className="px-4 py-2 font-cond font-bold tracking-[0.25em] text-[10px] md:text-[11px] uppercase text-bone"
            style={{ backgroundColor: "var(--blood)" }}
          >
            Book Now
          </a>
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
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden border-t border-border bg-black/95 backdrop-blur overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-1 max-h-[80vh] overflow-y-auto">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/80 hover:text-bone py-3 border-b border-border/40"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/deck"
              onClick={() => setOpen(false)}
              className="font-cond font-bold tracking-[0.25em] text-xs uppercase py-3"
              style={{ color: "var(--blood)" }}
            >
              Pitch Deck
            </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ---------- HERO ---------- */

function AnimatedCounter({
  to,
  suffix = "",
  duration = 2.2,
  className = "",
}: { to: number; suffix?: string; duration?: number; className?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  const formatted =
    to >= 1_000_000 ? `${(val / 1_000_000).toFixed(val >= to ? 0 : 1)}M`
    : to >= 1_000   ? `${(val / 1_000).toFixed(val >= to ? 0 : 1)}K`
    : `${val}`;
  return <span ref={ref} className={className}>{formatted}{suffix}</span>;
}

function Hero() {
  const tickerItems = [
    "686M+ TOTAL VIEWS",
    "324K+ SUBSCRIBERS",
    "18M+ LIKES",
    "2.9M+ SHARES",
    "WHERE CULTURE GOES VIRAL",
    "REAL CONTENT • REAL PEOPLE • REAL VIEWS",
    "BOOK A SHOOT",
  ];
  return (
    <section
      id="top"
      className="relative min-h-screen w-full overflow-hidden grunge-overlay scanlines flex flex-col pt-20"
    >
      {/* Background image with slow zoom */}
      <div
        className="absolute inset-0 animate-slow-zoom pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.92)), url(${grunge})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Cinematic intro video layer */}
      <video
        src={bwfIntroVideo.url}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      {/* Ambient blood glows */}
      <div
        className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full blur-3xl pointer-events-none animate-pulse-glow"
        style={{ backgroundColor: "var(--blood)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none animate-pulse-glow-slow"
        style={{ backgroundColor: "var(--blood)" }}
      />

      {/* Camera prop */}
      <img
        src={camera}
        alt=""
        className="absolute right-[-60px] bottom-[8%] w-[260px] md:w-[460px] opacity-20 mix-blend-screen pointer-events-none rotate-[-8deg]"
      />

      {/* Crosshair grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--bone) 1px, transparent 1px), linear-gradient(to bottom, var(--bone) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Top meta bar */}
      <div className="relative z-20 max-w-7xl w-full mx-auto px-6 md:px-12 mt-4 md:mt-6 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-black/60 backdrop-blur"
        >
          <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ backgroundColor: "var(--blood)" }} />
          <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/80">
            Now Streaming Worldwide
          </span>
        </motion.div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="hidden md:block font-cond font-bold tracking-[0.4em] text-[10px] uppercase text-bone/40"
        >
          EST. — HIP-HOP / CULTURE / MEDIA
        </motion.span>
      </div>

      {/* Main hero content */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10 md:py-16 grid md:grid-cols-12 gap-10 items-center">
        {/* LEFT — typography column */}
        <div className="md:col-span-7 text-center md:text-left flex flex-col items-center md:items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center md:justify-start gap-3 mb-6"
          >
            <span
              className="font-display tracking-[0.15em] text-2xl md:text-3xl lg:text-4xl text-bone"
              style={{ textShadow: "0 0 24px var(--blood-glow)" }}
            >
              BWF <span style={{ color: "var(--blood)" }}>MEDIA</span> TV
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="font-display leading-[0.82] tracking-tight text-bone heavy-shadow"
          >
            <span className="block text-[18vw] md:text-[10rem] lg:text-[12rem]">WHERE</span>
            <span className="block text-[18vw] md:text-[10rem] lg:text-[12rem]" style={{ color: "var(--blood)" }}>
              CULTURE
            </span>
            <span className="block text-[18vw] md:text-[10rem] lg:text-[12rem] text-outline">
              GOES VIRAL.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 max-w-xl mx-auto md:mx-0 text-bone/75 text-base md:text-lg leading-relaxed"
          >
            BWF™ is a media network turning artists, moments, and movements into{" "}
            <span className="text-bone font-semibold">cultural events</span>. Interviews,
            music videos, viral clips — distributed to a global audience that{" "}
            <span style={{ color: "var(--blood)" }} className="font-semibold">actually watches</span>.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 flex flex-wrap items-center justify-center md:justify-start gap-4"
          >
            <a
              href="#contact"
              className="group relative inline-flex items-center gap-3 px-8 py-4 font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone overflow-hidden"
              style={{ backgroundColor: "var(--blood)", boxShadow: "var(--shadow-blood)" }}
            >
              <span className="relative z-10">Book a Shoot</span>
              <ArrowUpRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span className="absolute inset-0 bg-black/30 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </a>
            <a
              href="https://youtube.com/@bwfmedia"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-3 px-7 py-4 font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone border-2 border-border hover:border-blood transition-colors backdrop-blur bg-black/40"
            >
              <Play className="w-4 h-4 fill-bone" />
              Watch on YouTube
            </a>
          </motion.div>

          {/* Animated stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.95 }}
            className="mt-12 grid grid-cols-3 gap-4 md:gap-8 max-w-xl mx-auto md:mx-0 border-t border-border pt-8"
          >
            <div>
              <div className="font-display text-3xl md:text-5xl leading-none text-bone">
                <AnimatedCounter to={686} suffix="M+" />
              </div>
              <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/50 mt-2">Views</div>
            </div>
            <div className="border-l border-border pl-4 md:pl-8">
              <div className="font-display text-3xl md:text-5xl leading-none" style={{ color: "var(--blood)" }}>
                <AnimatedCounter to={324} suffix="K+" />
              </div>
              <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/50 mt-2">Subscribers</div>
            </div>
            <div className="border-l border-border pl-4 md:pl-8">
              <div className="font-display text-3xl md:text-5xl leading-none text-bone">
                <AnimatedCounter to={18} suffix="M+" />
              </div>
              <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/50 mt-2">Likes</div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT — featured visual card */}
        <motion.div
          initial={{ opacity: 0, x: 30, rotate: 4 }}
          animate={{ opacity: 1, x: 0, rotate: 2 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="md:col-span-5 hidden md:block"
        >
          <div className="relative group">
            {/* Floating tag */}
            <div
              className="absolute -top-5 -left-5 z-20 px-4 py-2 font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone rotate-[-4deg]"
              style={{ backgroundColor: "var(--blood)", boxShadow: "var(--shadow-blood)" }}
            >
              ▶ Featured Drop
            </div>
            {/* Card */}
            <div
              className="relative border-2 overflow-hidden"
              style={{ borderColor: "var(--blood)", boxShadow: "var(--shadow-deep)" }}
            >
              <img src={viralThumbs} alt="Featured BWF Media content" className="w-full h-[480px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              {/* Play overlay */}
              <button className="absolute inset-0 flex items-center justify-center group/play">
                <span
                  className="w-20 h-20 rounded-full flex items-center justify-center backdrop-blur transition-transform group-hover/play:scale-110"
                  style={{ backgroundColor: "var(--blood)", boxShadow: "0 0 60px var(--blood-glow)" }}
                >
                  <Play className="w-8 h-8 text-bone fill-bone ml-1" />
                </span>
              </button>
              {/* Bottom meta */}
              <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                <div>
                  <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/60 mb-1">
                    Latest Interview
                  </div>
                  <div className="font-display text-2xl text-bone leading-tight">
                    REAL ARTISTS.<br />REAL STORIES.
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl" style={{ color: "var(--blood)" }}>4.2M</div>
                  <div className="font-cond tracking-[0.25em] text-[9px] uppercase text-bone/50">weekly</div>
                </div>
              </div>
            </div>
            {/* Decorative stack card behind */}
            <div
              className="absolute -bottom-4 -right-4 w-full h-full border-2 -z-10"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.4)" }}
            />
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="relative z-10 hidden md:flex flex-col items-center pb-6">
        <span className="font-cond tracking-[0.4em] text-[10px] uppercase text-bone/40 mb-2">Scroll</span>
        <div className="w-px h-10 bg-bone/20 relative overflow-hidden">
          <span className="absolute top-0 left-0 w-full h-3 animate-scroll-cue" style={{ backgroundColor: "var(--blood)" }} />
        </div>
      </div>

      {/* Marquee ticker */}
      <div
        className="relative z-10 border-y border-border overflow-hidden py-3"
        style={{ backgroundColor: "var(--blood)" }}
      >
        <div className="flex animate-marquee whitespace-nowrap">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="mx-8 font-cond font-bold tracking-[0.4em] text-xs uppercase text-bone inline-flex items-center gap-8">
              {item}
              <span className="text-bone/60">★</span>
            </span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5 z-20" style={{ background: "var(--gradient-blood)" }} />
    </section>
  );
}

/* ---------- ABOUT ---------- */

function About() {
  const focus = [
    "Live concert coverage",
    "Artist interviews",
    "Behind-the-scenes access",
    "Viral short-form music clips",
  ];
  const perf = [
    { big: "686M+", label: "Total Views" },
    { big: "324K+", label: "Subscribers" },
    { big: "18M+", label: "Total Likes" },
    { big: "2.9M+", label: "Shares" },
    { big: "4.2M+", label: "Weekly Views" },
  ];
  return (
    <Section id="about" label="About BWF™">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        <div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-8">
            ABOUT <span style={{ color: "var(--blood)" }}>BWF<sup className="text-[0.4em] align-super">™</sup></span>
          </h2>
          <p className="text-bone text-base md:text-lg leading-relaxed mb-5">
            BWF™ is a fast-growing digital media platform covering music, live events,
            interviews, and viral cultural moments.
          </p>
          <p className="text-bone text-base md:text-lg leading-relaxed mb-8">
            We specialize in turning live performances and artist moments into
            high-reach, high-engagement content distributed across multiple platforms.
          </p>
          <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-4" style={{ color: "var(--blood)" }}>
            Our content focuses on
          </div>
          <ul className="space-y-3">
            {focus.map((t, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="block w-2 h-2 mt-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                <span className="text-bone/85">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-5" style={{ color: "var(--blood)" }}>
            📊 Platform Reach & Performance
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {perf.map((s, i) => (
              <div
                key={i}
                className="border-l-4 pl-5 py-4"
                style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.45)" }}
              >
                <div className="font-display text-3xl md:text-5xl leading-none" style={{ color: "var(--blood)" }}>{s.big}</div>
                <div className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-bone/70 mt-2">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card-tick p-6 border-2" style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}>
            <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-3" style={{ color: "var(--blood)" }}>
              Engagement Strength
            </div>
            <ul className="space-y-2 text-bone/80 text-sm md:text-base">
              <li className="flex gap-3"><Share2 className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: "var(--blood)" }} /> High share-to-view ratio — content spreads beyond platform reach</li>
              <li className="flex gap-3"><Flame className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: "var(--blood)" }} /> Strong short-form viral performance</li>
              <li className="flex gap-3"><Eye className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: "var(--blood)" }} /> Consistent weekly audience activity</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-16 grid md:grid-cols-4 gap-5">
        <div className="md:col-span-1">
          <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-2" style={{ color: "var(--blood)" }}>🎯 Audience Insight</div>
          <h3 className="font-display text-3xl md:text-4xl leading-tight text-bone">WHO'S<br /><span style={{ color: "var(--blood)" }}>WATCHING.</span></h3>
        </div>
        {[
          { k: "Music-Driven", v: "Hip-hop / R&B / mainstream culture" },
          { k: "Highly Active", v: "Sharing & resharing across platforms" },
          { k: "Engaged", v: "Viral clips & interviews" },
          { k: "Demo", v: "Primarily 16–34" },
        ].map((row, i) => (
          <div key={i} className="card-tick p-5 border-2" style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}>
            <div className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase mb-2" style={{ color: "var(--blood)" }}>{row.k}</div>
            <div className="font-display text-lg md:text-xl text-bone leading-tight tracking-tight">{row.v}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- SERVICES ---------- */

/* ---------- GLOBAL AUDIENCE (analytics panel) ---------- */

function GlobalAudience() {
  const primary = {
    flag: "🇺🇸",
    country: "United States",
    pct: "45.5%",
    views: "312.7M views",
    note: "Primary audience base and ticket-driving region",
  };
  const others = [
    { flag: "🇬🇧", country: "United Kingdom", pct: "4.7%", views: "32.5M" },
    { flag: "🇮🇳", country: "India",          pct: "4.6%", views: "31.5M" },
    { flag: "🇩🇪", country: "Germany",        pct: "4.1%", views: "27.9M" },
    { flag: "🇨🇦", country: "Canada",         pct: "3.3%", views: "22.7M" },
  ];
  const additional = [
    "Australia", "France", "Mexico", "Brazil", "South Africa",
    "Philippines", "Nigeria", "Indonesia", "Japan", "UAE",
  ];
  const insights = [
    "Strong U.S. audience base for live event promotion",
    "Global distribution across major music markets",
    "High engagement short-form viewing behavior",
    "Content optimized for viral sharing and reposting",
  ];
  return (
    <Section id="reach" label="Global Audience Reach">
      <div className="grid md:grid-cols-3 gap-8 md:gap-12 items-start mb-12">
        <div className="md:col-span-2">
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-6">
            GLOBAL <span style={{ color: "var(--blood)" }}>AUDIENCE</span><br />REACH.
          </h2>
          <p className="text-bone text-base md:text-lg leading-relaxed max-w-2xl">
            BWF™ Media Network reaches a highly engaged global audience across music, culture,
            and live event content. Distribution is driven by strong U.S. viewership combined
            with international viral reach across key global markets.
          </p>
        </div>
        <div className="flex md:justify-end">
          <div className="inline-flex items-center gap-3 px-4 py-3 border-2" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.6)" }}>
            <BarChart3 className="w-5 h-5" style={{ color: "var(--blood)" }} />
            <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/80">
              Live Network Analytics
            </span>
          </div>
        </div>
      </div>

      {/* Primary US card — full width */}
      <div
        className="relative p-6 md:p-8 mb-5 border-2 overflow-hidden"
        style={{ borderColor: "var(--blood)", backgroundColor: "rgba(10,10,15,0.85)" }}
      >
        <div className="absolute top-0 left-0 h-full w-1.5" style={{ backgroundColor: "var(--blood)" }} />
        <div className="grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 flex items-center gap-4">
            <span className="text-5xl md:text-6xl leading-none">{primary.flag}</span>
            <div>
              <div className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-bone/60 mb-1">Primary Market</div>
              <div className="font-display text-2xl md:text-3xl text-bone tracking-tight">{primary.country}</div>
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="font-display text-5xl md:text-6xl leading-none" style={{ color: "var(--blood)" }}>{primary.pct}</div>
            <div className="font-cond tracking-[0.2em] text-[10px] uppercase text-bone/60 mt-2">{primary.views}</div>
          </div>
          <div className="md:col-span-4 text-bone/70 text-sm leading-snug border-l border-border pl-4">
            {primary.note}
          </div>
        </div>
      </div>

      {/* Other countries grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {others.map((c, i) => (
          <div
            key={i}
            className="card-tick relative p-5 border-2 flex items-center justify-between gap-4"
            style={{ borderColor: "var(--border)", backgroundColor: "rgba(10,10,15,0.7)" }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-3xl leading-none flex-shrink-0">{c.flag}</span>
              <div className="min-w-0">
                <div className="font-display text-lg md:text-xl text-bone tracking-tight truncate">{c.country}</div>
                <div className="font-cond tracking-[0.2em] text-[10px] uppercase text-bone/55 mt-0.5">
                  {c.views} views
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-display text-2xl md:text-3xl leading-none" style={{ color: "var(--blood)" }}>{c.pct}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional reach */}
      <div
        className="p-5 md:p-6 mb-10 border border-border"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-4 h-4" style={{ color: "var(--blood)" }} />
          <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/70">
            Additional Global Reach
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {additional.map((c) => (
            <span
              key={c}
              className="px-3 py-1.5 text-xs font-cond tracking-widest uppercase text-bone/80 border border-border"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              {c}
            </span>
          ))}
          <span className="px-3 py-1.5 text-xs font-cond tracking-widest uppercase border" style={{ color: "var(--blood)", borderColor: "var(--blood)" }}>
            + more
          </span>
        </div>
      </div>

      {/* Why this matters insight box */}
      <div
        className="relative p-6 md:p-8 border-2 overflow-hidden"
        style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.7)" }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ backgroundColor: "var(--blood)" }} />
        <div className="relative grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase mb-3" style={{ color: "var(--blood)" }}>
              💡 Why This Matters
            </div>
            <h3 className="font-display text-3xl md:text-4xl leading-tight text-bone tracking-tight">
              BUILT FOR<br /><span style={{ color: "var(--blood)" }}>TOUR PROMOTION.</span>
            </h3>
          </div>
          <ul className="md:col-span-2 grid sm:grid-cols-2 gap-4">
            {insights.map((t, i) => (
              <li key={i} className="flex gap-3 items-start text-bone/85 text-sm md:text-base leading-snug">
                <span className="block w-2 h-2 mt-2 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-8 pt-6 border-t border-border text-bone/90 text-sm md:text-base">
          👉 This combination makes BWF™ Media ideal for <span style={{ color: "var(--blood)" }}>concert coverage, artist interviews, and tour promotion campaigns.</span>
        </div>
      </div>
    </Section>
  );
}

/* ---------- SERVICES ---------- */

function Services() {
  const services = [
    {
      icon: Mic,
      tag: "🎤 Live Event Coverage",
      title: "EVENT COVERAGE",
      items: ["Performance highlights", "Crowd energy captures", "Viral clip editing (vertical + horizontal)"],
    },
    {
      icon: Video,
      tag: "🎙 Artist Interviews",
      title: "INTERVIEWS",
      items: ["Short-form interviews (5–15 min)", "Press-style conversations", "Promo for upcoming releases"],
    },
    {
      icon: Camera,
      tag: "🎬 Behind-the-Scenes",
      title: "BTS ACCESS",
      items: ["Tour moments", "Backstage coverage", "Venue + crowd storytelling"],
    },
    {
      icon: Smartphone,
      tag: "📱 Distribution",
      title: "DISTRIBUTION",
      items: ["YouTube", "Instagram Reels", "TikTok", "Short-form viral networks"],
    },
  ];
  return (
    <Section id="services" label="Content Services">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow">
          WHAT WE <span style={{ color: "var(--blood)" }}>DELIVER.</span>
        </h2>
        <p className="text-bone max-w-md md:text-right">
          When covering events, BWF™ delivers a full content stack — built for reach, engagement, and post-show momentum.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {services.map((s, i) => (
          <div
            key={i}
            className="card-tick relative flex flex-col p-6 border-2"
            style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "var(--blood)" }} />
            <div className="font-cond font-bold tracking-[0.2em] text-[10px] uppercase text-bone/60 mb-4">{s.tag}</div>
            <s.icon className="w-8 h-8 mb-4" style={{ color: "var(--blood)" }} strokeWidth={2.5} />
            <div className="font-display text-2xl md:text-3xl text-bone tracking-tight mb-4 leading-tight">{s.title}</div>
            <ul className="space-y-2 mt-auto">
              {s.items.map((it, j) => (
                <li key={j} className="flex gap-2 text-bone/75 text-sm leading-snug">
                  <span className="block w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                  {it}
                </li>
              ))}
            </ul>
            <div className="absolute top-4 right-4 font-cond text-xs tracking-widest text-bone/30">0{i + 1}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- PROMOTERS ---------- */

function Promoters() {
  const benefits = [
    { icon: Eye, title: "INCREASED VISIBILITY", body: "Boost online presence for your event before, during, and after the show." },
    { icon: Share2, title: "VIRAL CIRCULATION", body: "Post-show content engineered for share-driven distribution." },
    { icon: Megaphone, title: "PROMO REACH WITHOUT AD SPEND", body: "Tap our existing audience instead of paying for impressions." },
    { icon: Heart, title: "HIGH-ENGAGEMENT EXPOSURE", body: "Reach a culture-driven audience that actually reacts and shares." },
  ];
  return (
    <Section id="promoters" label="Why Promoters Work With BWF™">
      <div className="grid md:grid-cols-5 gap-10 md:gap-16">
        <div className="md:col-span-2">
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-6">
            WE DON'T JUST<br />
            COVER EVENTS —<br />
            <span style={{ color: "var(--blood)" }}>WE AMPLIFY THEM.</span>
          </h2>
          <p className="text-bone text-base md:text-lg leading-relaxed max-w-md">
            Our goal is to help elevate event awareness before, during, and after the show — turning one night into weeks of content circulation.
          </p>
          <div className="mt-8 inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.45)" }}>
            <span className="font-display text-xl md:text-2xl tracking-tight" style={{ color: "var(--blood)" }}>
              ONE SHOW. WEEKS OF REACH.
            </span>
          </div>
        </div>
        <div className="md:col-span-3 grid sm:grid-cols-2 gap-5">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="p-6 border-2"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div className="w-11 h-11 rounded flex items-center justify-center mb-4" style={{ backgroundColor: "var(--blood)" }}>
                <b.icon className="w-5 h-5 text-bone" strokeWidth={2.5} />
              </div>
              <div className="font-display text-lg md:text-xl tracking-tight text-bone leading-tight mb-2">{b.title}</div>
              <div className="text-bone/65 text-sm leading-relaxed">{b.body}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- THE SHIFT ---------- */

function Shift() {
  return (
    <Section id="shift" label="The Shift">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-8">
            HIP-HOP MEDIA<br />
            <span style={{ color: "var(--blood)" }}>IS CHANGING</span>
          </h2>
          <ul className="space-y-4 text-bone/85 text-base md:text-lg">
            {[
              "Culture moves faster than mainstream media",
              "Viral moments break before major platforms catch on",
              "Audiences want raw, unfiltered, real content",
            ].map((t, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="block w-2 h-2 mt-3 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}>
            <span className="font-display text-2xl md:text-3xl tracking-tight" style={{ color: "var(--blood)" }}>
              BWF MEDIA IS ALREADY THERE.
            </span>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden">
          <img src={audience} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.85))" }} />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="font-brush text-xl md:text-2xl" style={{ color: "var(--blood)" }}>The next generation</div>
            <div className="font-display text-4xl md:text-5xl text-bone leading-none mt-1">DOESN'T WAIT.</div>
          </div>
          <div className="absolute top-4 right-4 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: "var(--blood)" }} />
          <div className="absolute top-3 right-10 font-cond font-bold tracking-widest text-[10px] uppercase text-bone">LIVE</div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- PRICING ---------- */

function Pricing() {
  const tiers = [
    {
      name: "BASIC PROMO",
      price: "$400 – $600",
      reach: "25K – 75K views",
      tag: "Entry",
      bullets: ["Good for new artists", "Low risk entry point", "Single-platform push"],
      featured: false,
    },
    {
      name: "STANDARD PROMO",
      price: "$700 – $1,000",
      reach: "75K – 200K views",
      tag: "Most Popular",
      bullets: ["Stronger promotional push", "Includes Shorts cutdowns", "Where most artists land"],
      featured: true,
    },
    {
      name: "PREMIUM PLACEMENT",
      price: "$1,200 – $2,000",
      reach: "150K – 500K+ views",
      tag: "Priority",
      bullets: ["Priority posting slot", "Strong promo push", "Possibly pinned or repeated exposure"],
      featured: false,
    },
    {
      name: "INTERVIEW + PROMO COMBO",
      price: "$1,500 – $3,000",
      reach: "Multi-week exposure cycle",
      tag: "Flagship",
      bullets: ["Full interview content", "Clips + Shorts package", "Multiple posts & longer cycle"],
      featured: false,
    },
  ];
  return (
    <Section id="pricing" label="Pricing Tiers">
      <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-4">
        PICK YOUR <span style={{ color: "var(--blood)" }}>PUSH.</span>
      </h2>
      <p className="text-bone text-base md:text-lg leading-relaxed max-w-2xl mb-12">
        Transparent tiers built for artists, labels, and promoters. Every package is engineered for reach — no smoke, no inflated numbers.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {tiers.map((t, i) => (
          <div
            key={i}
            className="card-tick relative p-6 border-2 flex flex-col"
            style={{
              borderColor: t.featured ? "var(--blood)" : "var(--border)",
              backgroundColor: t.featured ? "rgba(120,0,0,0.18)" : "rgba(0,0,0,0.55)",
            }}
          >
            <div
              className="absolute -top-3 left-4 px-3 py-1 font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-bone"
              style={{ backgroundColor: t.featured ? "var(--blood)" : "#1a1a1a", border: "1px solid var(--border)" }}
            >
              {t.tag}
            </div>
            <div className="font-display text-xl md:text-2xl tracking-tight text-bone leading-tight mt-2 mb-4">
              {t.name}
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <DollarSign className="w-5 h-5" style={{ color: "var(--blood)" }} />
              <span className="font-display text-3xl md:text-4xl leading-none" style={{ color: "var(--blood)" }}>
                {t.price.replace("$", "")}
              </span>
            </div>
            <div className="font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone/70 mb-5">
              {t.reach}
            </div>
            <ul className="space-y-2 text-bone/80 text-sm leading-relaxed mb-6 flex-1">
              {t.bullets.map((b, j) => (
                <li key={j} className="flex gap-3 items-start">
                  <span className="block w-1.5 h-1.5 mt-2 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <a
              href="#contact"
              className="block text-center px-4 py-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone transition-opacity hover:opacity-90"
              style={{ backgroundColor: t.featured ? "var(--blood)" : "transparent", border: "1px solid var(--blood)" }}
            >
              Book This Tier
            </a>
          </div>
        ))}
      </div>
      <div className="mt-10 inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <span className="font-display text-xl md:text-2xl tracking-tight text-bone">
          INTERVIEW + PROMO COMBO — <span style={{ color: "var(--blood)" }}>WHERE THE REAL MONEY IS.</span>
        </span>
      </div>
    </Section>
  );
}

/* ---------- PROOF ---------- */

function Proof() {
  const stats = [
    { big: "686M+", label: "TOTAL VIEWS", sub: "Across all platforms" },
    { big: "8M+", label: "MONTHLY VIEWS", sub: "Average reach" },
    { big: "324K+", label: "SUBSCRIBERS", sub: "Active community" },
  ];
  return (
    <Section id="proof" label="Track Record">
      <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-12">
        WE DON'T CHASE VIRAL —<br />
        <span style={{ color: "var(--blood)" }}>WE CREATE IT.</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
        {stats.map((s, i) => (
          <div
            key={i}
            className="border-l-4 pl-6 py-4"
            style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <div className="font-display text-5xl md:text-7xl leading-none" style={{ color: "var(--blood)" }}>{s.big}</div>
            <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase text-bone mt-3">{s.label}</div>
            <div className="text-bone/60 text-sm mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-black rounded-2xl p-6 md:p-10">
        <div className="flex items-end justify-between mb-8">
          <h3 className="font-display text-3xl md:text-4xl text-bone">
            Featured <span style={{ color: "var(--blood)" }}>Videos</span>
          </h3>
          <span className="font-brush text-xl hidden sm:block" style={{ color: "var(--blood)" }}>+ 200 more</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {[
            "9vGoBJa1DnM",
            "2yIdA5Jp7vU",
            "LeMMMetmTT0",
            "xXBDvU2S9Es",
          ].map((id) => (
            <div
              key={id}
              className="group relative aspect-video overflow-hidden rounded-xl border border-border transition-all duration-300 hover:scale-[1.02] hover:border-[color:var(--blood)] hover:shadow-[0_0_40px_-5px_rgba(180,0,0,0.5)]"
            >
              <iframe
                src={`https://www.youtube.com/embed/${id}`}
                title={`BWF Media featured video ${id}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- ENGINE ---------- */

function Engine() {
  const items = [
    { icon: Mic, title: "Interviews", desc: "1-on-1 viral conversations with artists, athletes, and culture-shakers." },
    { icon: Film, title: "Music Videos", desc: "HD productions that double as viral marketing assets." },
    { icon: Smartphone, title: "Viral Clips", desc: "Short-form cuts engineered for TikTok, Reels & Shorts." },
    { icon: Flame, title: "Street Content", desc: "Raw, unscripted moments straight from the culture." },
  ];
  return (
    <Section id="engine" label="Content Engine">
      <div className="grid md:grid-cols-5 gap-10 md:gap-12">
        <div className="md:col-span-2">
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow">
            ONE SHOOT.<br />
            <span style={{ color: "var(--blood)" }}>MULTIPLE</span><br />
            VIRAL ASSETS.
          </h2>
          <p className="mt-6 text-bone text-base md:text-lg leading-relaxed max-w-sm">
            Every piece of content is engineered for distribution across YouTube, Shorts, Reels, TikTok, and IG — turning one shoot into a full media cycle.
          </p>
        </div>
        <div className="md:col-span-3 grid sm:grid-cols-2 gap-5">
          {items.map((it, i) => (
            <div
              key={i}
              className="relative p-6 border-2 hover:border-blood transition-colors"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div className="w-12 h-12 flex items-center justify-center rounded mb-4" style={{ backgroundColor: "var(--blood)" }}>
                <it.icon className="w-6 h-6 text-bone" strokeWidth={2.5} />
              </div>
              <div className="font-display text-2xl md:text-3xl text-bone tracking-tight mb-2">{it.title.toUpperCase()}</div>
              <div className="text-bone/60 text-sm leading-relaxed">{it.desc}</div>
              <div className="absolute top-4 right-4 font-cond text-xs tracking-widest text-bone/30">0{i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- AUDIENCE ---------- */

function Audience() {
  const rows = [
    { k: "AGE", v: "18 – 34", note: "Peak cultural buying power" },
    { k: "REGION", v: "United States", note: "Strong Southern influence" },
    { k: "INTEREST", v: "Hip-Hop & Street Culture", note: "Niche-deep, loyalty-high" },
    { k: "ENGAGEMENT", v: "Above category average", note: "Comments, shares, repeat views" },
  ];
  return (
    <Section id="audience" label="Demographics">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="relative aspect-[4/5] md:aspect-auto md:h-[520px] overflow-hidden">
          <img src={audience} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent, rgba(0,0,0,0.85))" }} />
          <div className="absolute bottom-6 left-6">
            <div className="font-brush text-2xl text-bone">Culture is</div>
            <div className="font-display text-5xl md:text-6xl leading-none" style={{ color: "var(--blood)" }}>WATCHING.</div>
          </div>
        </div>
        <div>
          <h2 className="font-display text-5xl md:text-6xl leading-[0.9] text-bone heavy-shadow mb-8">
            REAL AUDIENCE.<br />
            <span style={{ color: "var(--blood)" }}>REAL ENGAGEMENT.</span>
          </h2>
          <div className="space-y-5">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[100px_1fr] gap-5 items-baseline pb-4 border-b border-border">
                <span className="font-cond font-bold tracking-[0.25em] text-[10px] uppercase" style={{ color: "var(--blood)" }}>{row.k}</span>
                <div>
                  <div className="font-display text-xl md:text-2xl text-bone tracking-tight">{row.v}</div>
                  <div className="text-bone/50 text-sm">{row.note}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.4)" }}>
            <span className="font-display text-xl md:text-2xl tracking-tight" style={{ color: "var(--blood)" }}>
              THIS AUDIENCE DRIVES CULTURE.
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- REVENUE ---------- */

function Revenue() {
  const tiers = [
    { name: "LIVE INTERVIEW", price: "$500", deposit: "$250 deposit", icon: Mic, items: ["1-on-1 (up to 45 min)", "Promo on all platforms", "Live on YouTube", "Full edit + thumbnail"] },
    { name: "MUSIC VIDEO", price: "$900", deposit: "$400 deposit", icon: Film, items: ["HD production", "Up to 4hr shoot", "Pro camera + edit", "YouTube upload + promo"] },
    { name: "PROMO PACKAGE", price: "$300", deposit: "$150 deposit", icon: TrendingUp, items: ["Upload to BWF Media TV", "Shoutout in video", "Shorts clip 15-30s", "Title + thumbnail optimized"] },
    { name: "AD REVENUE", price: "Recurring", deposit: "YouTube Partner", icon: DollarSign, items: ["Monthly ad payout", "Sponsor integrations", "Brand deal pipeline", "Channel memberships"] },
  ];
  return (
    <Section id="revenue" label="Monetization">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow">
          PROVEN <span style={{ color: "var(--blood)" }}>REVENUE</span> MODEL
        </h2>
        <div className="md:text-right">
          <div className="font-brush text-xl md:text-2xl text-bone/70">4 active streams</div>
          <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mt-1" style={{ color: "var(--blood)" }}>
            Already generating
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tiers.map((t, i) => (
          <div
            key={i}
            className="card-tick relative flex flex-col p-6 border-2"
            style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "var(--blood)" }} />
            <t.icon className="w-7 h-7 mb-4" style={{ color: "var(--blood)" }} strokeWidth={2.5} />
            <div className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/70 mb-2">{t.name}</div>
            <div className="font-display text-4xl md:text-5xl leading-none mb-1" style={{ color: "var(--blood)" }}>{t.price}</div>
            <div className="font-cond text-[10px] tracking-widest uppercase text-bone/50 mb-5">{t.deposit}</div>
            <ul className="space-y-2 mt-auto">
              {t.items.map((it, j) => (
                <li key={j} className="flex gap-2 text-bone/75 text-xs leading-snug">
                  <span className="block w-1 h-1 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--blood)" }} />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- SCALE ---------- */

function Scale() {
  const items = [
    "More high-profile interviews & exclusives",
    "Higher production quality across the board",
    "Consistent content series & franchise IP",
    "Expanded reach into new regional markets",
  ];
  return (
    <Section id="scale" label="The Opportunity">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-8">
            WITH THE RIGHT<br />
            PARTNER,<br />
            <span style={{ color: "var(--blood)" }}>WE SCALE FAST.</span>
          </h2>
          <div className="space-y-2">
            {items.map((t, i) => (
              <div key={i} className="flex items-center gap-5 py-3 border-b border-border">
                <span className="font-display text-2xl md:text-3xl w-10" style={{ color: "var(--blood)" }}>0{i + 1}</span>
                <span className="text-bone text-base md:text-lg">{t}</span>
                <ArrowUpRight className="w-5 h-5 ml-auto text-bone/30" />
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-square">
          <img src={musicVideo} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.85))" }} />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="font-brush text-xl md:text-2xl text-bone/80">Ready for</div>
            <div className="font-display text-4xl md:text-6xl leading-none heavy-shadow" style={{ color: "var(--blood)" }}>NATIONAL</div>
            <div className="font-display text-4xl md:text-6xl leading-none text-bone heavy-shadow">EXPOSURE.</div>
          </div>
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--blood)" }} />
            <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone">REC • 4K</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- PARTNERSHIP ---------- */

function Partner() {
  const opts = [
    { tag: "Option 01", title: "CONTENT LICENSING", body: "Pay per video for premium long-form content, interviews, and franchise series.", icon: Film },
    { tag: "Option 02", title: "DISTRIBUTION DEAL", body: "Partner to expand BWF reach across networks, platforms, and new markets.", icon: Globe },
    { tag: "Option 03", title: "UPFRONT INVESTMENT", body: "Capital injection to scale production, talent, and content velocity.", icon: TrendingUp },
  ];
  return (
    <Section id="partner" label="The Partnership">
      <h2 className="font-display text-5xl md:text-7xl leading-[0.9] text-bone heavy-shadow mb-12">
        THREE WAYS TO <span style={{ color: "var(--blood)" }}>RUN IT UP.</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {opts.map((o, i) => (
          <div
            key={i}
            className="card-tick relative flex flex-col p-7 border-2 overflow-hidden"
            style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <div
              className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: "var(--blood)" }}
            />
            <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-5" style={{ color: "var(--blood)" }}>{o.tag}</div>
            <o.icon className="w-10 h-10 mb-5 text-bone" strokeWidth={2} />
            <div className="font-display text-2xl md:text-3xl tracking-tight text-bone mb-3 leading-tight">{o.title}</div>
            <p className="text-bone leading-relaxed text-sm md:text-base">{o.body}</p>
            <div className="mt-auto pt-6 flex items-center gap-2">
              <Handshake className="w-5 h-5" style={{ color: "var(--blood)" }} />
              <span className="font-cond font-bold tracking-[0.2em] text-xs uppercase text-bone/60">Open to discuss</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- WHY US ---------- */

function Why() {
  const reasons = [
    { icon: Trophy, title: "PROVEN VIRAL SUCCESS", body: "686M+ views isn't theory — it's a track record." },
    { icon: Users, title: "DIRECT ARTIST ACCESS", body: "Trusted relationships across the hip-hop ecosystem." },
    { icon: Flame, title: "STRONG REGIONAL INFLUENCE", body: "Deep cultural roots in the South & beyond." },
    { icon: Sparkles, title: "CONSISTENT OUTPUT", body: "We don't go quiet. New drops, every week." },
  ];
  return (
    <Section id="why" label="The Edge">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-6xl md:text-8xl leading-[0.85] text-bone heavy-shadow mb-6">
            WHY <span style={{ color: "var(--blood)" }}>US?</span>
          </h2>
          <p className="text-bone text-base md:text-lg leading-relaxed max-w-md mb-8">
            Anyone can shoot video. Few can move culture. We've been doing it long enough to know exactly which lane we own.
          </p>
          <div className="inline-block px-6 py-4 border-l-4" style={{ borderColor: "var(--blood)", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <span className="font-display text-2xl md:text-3xl tracking-tight" style={{ color: "var(--blood)" }}>
              WE CONTROL A CULTURE LANE.
            </span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="p-6 border-2"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div className="w-11 h-11 rounded flex items-center justify-center mb-4" style={{ backgroundColor: "var(--blood)" }}>
                <r.icon className="w-5 h-5 text-bone" strokeWidth={2.5} />
              </div>
              <div className="font-display text-lg md:text-xl tracking-tight text-bone leading-tight mb-2">{r.title}</div>
              <div className="text-bone/65 text-sm leading-relaxed">{r.body}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- VISION ---------- */

function Vision() {
  const pillars = [
    { n: "01", h: "TOP HIP-HOP", s: "Media Platform" },
    { n: "02", h: "ARTIST", s: "Discovery Hub" },
    { n: "03", h: "CULTURAL", s: "Authority" },
  ];
  return (
    <Section id="vision" label="The Future">
      <div className="text-center flex flex-col items-center">
        <h2 className="font-display text-6xl md:text-[7rem] leading-[0.85] text-bone heavy-shadow max-w-5xl">
          THE FUTURE OF<br />
          <span style={{ color: "var(--blood)" }}>BWF MEDIA.</span>
        </h2>
        <div className="mt-12 grid sm:grid-cols-3 gap-8 md:gap-10 max-w-5xl w-full">
          {pillars.map((p, i) => (
            <div
              key={i}
              className="border-t-2 pt-6 text-left"
              style={{ borderColor: "var(--blood)" }}
            >
              <div className="font-display text-3xl md:text-4xl mb-2" style={{ color: "var(--blood)" }}>{p.n}</div>
              <div className="font-display text-2xl md:text-3xl text-bone tracking-tight leading-tight">{p.h}</div>
              <div className="font-cond text-bone/60 tracking-widest text-sm uppercase mt-1">{p.s}</div>
            </div>
          ))}
        </div>
        <p className="mt-12 font-brush text-3xl md:text-4xl text-bone">
          A <span style={{ color: "var(--blood)" }}>next-generation</span> media company.
        </p>
      </div>
    </Section>
  );
}

/* ---------- CONTACT ---------- */

function Contact() {
  const contacts = [
    { icon: Mail, label: "Email", value: "bookbwfmediatv@mail.com", href: "mailto:bookbwfmediatv@mail.com", external: false },
    { icon: Instagram, label: "Instagram", value: "@bwfmediatv", href: "https://www.instagram.com/bwfmediatv?igsh=MWl6ZXU2MHA4ZDZteQ%3D%3D&utm_source=qr", external: true },
    { icon: Youtube, label: "YouTube", value: "@bwfmedia", href: "https://youtube.com/@bwfmedia", external: true },
  ];
  return (
    <Section id="contact" label="Let's Talk">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <h2 className="font-display text-6xl md:text-[7rem] leading-[0.85] text-bone heavy-shadow">
            LET'S BUILD<br />
            <span style={{ color: "var(--blood)" }}>SOMETHING</span><br />
            BIG.
          </h2>
          <p className="mt-6 text-bone text-base md:text-lg max-w-md leading-relaxed">
            The numbers are real. The audience is real. The opportunity is now. Lock it in.
          </p>
        </div>
        <div className="space-y-4">
          {contacts.map((c, i) => (
            <a
              key={i}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noreferrer" : undefined}
              className="card-tick flex items-center gap-5 p-5 border-2 group transition-all"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--blood)" }}>
                <c.icon className="w-6 h-6 text-bone" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/60">{c.label}</div>
                <div className="font-display text-lg md:text-2xl text-bone tracking-tight mt-1 truncate">{c.value}</div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-bone/40 group-hover:text-blood transition-colors flex-shrink-0" />
            </a>
          ))}
          <div
            className="mt-6 p-6 text-center border-2"
            style={{ borderColor: "var(--blood)", backgroundColor: "var(--blood)" }}
          >
            <div className="font-display text-2xl md:text-4xl tracking-tight text-bone heavy-shadow">
              SERIOUS INQUIRIES ONLY.
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- FOOTER ---------- */

function Footer() {
  const navLinks = [
    { href: "#about", label: "About" },
    { href: "#reach", label: "Reach" },
    { href: "#proof", label: "Proof" },
    { href: "#services", label: "Services" },
    { href: "#engine", label: "Engine" },
  ];
  const moreLinks = [
    { href: "#audience", label: "Audience" },
    { href: "#revenue", label: "Revenue" },
    { href: "#pricing", label: "Pricing" },
    { href: "#partner", label: "Partner" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <footer className="relative bg-black border-t border-border">
      {/* CTA strip */}
      <div
        className="relative overflow-hidden border-b border-border"
        style={{ background: "var(--gradient-blood)" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-display text-3xl md:text-5xl tracking-tight text-bone heavy-shadow text-center md:text-left leading-tight">
            READY TO GO <span className="text-outline">VIRAL</span>?
          </div>
          <a
            href="#contact"
            className="group inline-flex items-center gap-3 px-7 py-4 bg-black text-bone font-cond font-bold tracking-[0.3em] text-xs uppercase border-2 border-black hover:bg-bone hover:text-black transition-colors"
          >
            Lock In Your Shoot
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <a href="#top" className="flex items-center gap-3">
              <span className="font-display text-lg tracking-tight text-bone">
                BWF MEDIA <span style={{ color: "var(--blood)" }}>TV</span>
              </span>
            </a>
            <p className="mt-4 text-bone text-sm max-w-xs leading-relaxed">
              Real content. Real people. Real reach. Where culture goes viral.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {[
                { Icon: Youtube, href: "https://youtube.com/@bwfmediatv", label: "YouTube" },
                { Icon: Instagram, href: "https://www.instagram.com/bwfmediatv?igsh=MWl6ZXU2MHA4ZDZteQ%3D%3D&utm_source=qr", label: "Instagram" },
                { Icon: Music2, href: "https://tiktok.com/@bwfmediatv", label: "TikTok" },
                { Icon: Facebook, href: "https://www.facebook.com/share/1FmVHYjMfE/?mibextid=wwXIfr", label: "Facebook" },
                { Icon: Twitter, href: "https://twitter.com/bwfmediatv", label: "Twitter / X" },
                { Icon: Mail, href: "#contact", label: "Email" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                  aria-label={label}
                  className="w-9 h-9 inline-flex items-center justify-center border border-bone/20 text-bone/70 hover:text-bone hover:border-bone hover:bg-bone/5 transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 mb-4">
              Explore
            </div>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="font-cond tracking-[0.2em] text-xs uppercase text-bone/70 hover:text-bone transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 mb-4">
              Company
            </div>
            <ul className="space-y-2">
              {moreLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="font-cond tracking-[0.2em] text-xs uppercase text-bone/70 hover:text-bone transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/deck"
                  className="font-cond tracking-[0.2em] text-xs uppercase hover:text-bone transition-colors"
                  style={{ color: "var(--blood)" }}
                >
                  Pitch Deck
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone/40 mb-4">
              Connect
            </div>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://youtube.com/@bwfmediatv"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-cond tracking-[0.2em] text-xs uppercase text-bone/70 hover:text-bone transition-colors"
                >
                  <Youtube size={14} /> YouTube
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/bwfmediatv"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-cond tracking-[0.2em] text-xs uppercase text-bone/70 hover:text-bone transition-colors"
                >
                  <Instagram size={14} /> Instagram
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="flex items-center gap-2 font-cond tracking-[0.2em] text-xs uppercase text-bone/70 hover:text-bone transition-colors"
                >
                  <Mail size={14} /> Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/40">
            © {new Date().getFullYear()} BWF Media TV — Where Culture Goes Viral
          </div>
          <div className="font-cond tracking-[0.3em] text-[10px] uppercase text-bone/30">
            Founded by Dantavious Lee
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- PAGE ---------- */

export function OnePager() {
  return (
    <div className="bg-black text-bone">
      <ScrollProgress />
      <Nav />
      <Hero />
      <About />
      <GlobalAudience />
      <Shift />
      <Proof />
      <Services />
      <Engine />
      <Audience />
      <Revenue />
      <Scale />
      <Partner />
      <Promoters />
      <Why />
      <Pricing />
      <Vision />
      <Contact />
      <Footer />
    </div>
  );
}
