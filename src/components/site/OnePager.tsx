import { motion } from "framer-motion";
import { Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, Film, Flame, Clapperboard, Play, ArrowUpRight, Menu, X, Instagram, Youtube } from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import heroRapperVideo from "@/assets/hero-rapper.mp4.asset.json";
import viralThumbs from "@/assets/viral-thumbs.jpg";
import musicVideo from "@/assets/music-video.jpg";
import audience from "@/assets/audience.jpg";
import grunge from "@/assets/grunge-bg.jpg";

const YT_CHANNEL = "https://www.youtube.com/@bwfmediatv";

/* ---------- helpers ---------- */

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
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- nav ---------- */

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/studio", label: "Studio" },
    { to: "/videos", label: "Videos" },
    { to: "/off-the-block", label: "Off the Block" },
    { to: "/blog", label: "Blog" },
  ] as const;

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/85 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
        <RouterLink to="/" className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media TV" className="w-10 h-10 object-contain" />
          <span className="font-display text-lg tracking-wide text-white hidden sm:block">BWF Media TV</span>
        </RouterLink>

        <div className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <RouterLink
              key={l.to}
              to={l.to}
              className="text-[13px] text-white/70 hover:text-white transition-colors"
            >
              {l.label}
            </RouterLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <RouterLink
            to="/studio"
            className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium text-black bg-white hover:bg-white/90 px-4 py-2 rounded-full transition-colors"
          >
            Book a Shoot
          </RouterLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="md:hidden p-2 text-white"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <RouterLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-3 text-[15px] text-white/80 border-b border-white/5"
              >
                {l.label}
              </RouterLink>
            ))}
            <RouterLink
              to="/studio"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center text-[14px] font-medium text-black bg-white px-4 py-3 rounded-full"
            >
              Book a Shoot
            </RouterLink>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ---------- hero ---------- */

function Hero() {
  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden flex items-center pt-24">
      <video
        src={heroRapperVideo.url}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 35%, rgba(11,11,11,0.95) 100%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 w-full">
        <Reveal>
          <p className="text-[11px] tracking-[0.4em] text-white/60 mb-6">Premium media network</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="font-display text-[clamp(3rem,10vw,8rem)] leading-[0.95] text-white max-w-5xl">
            BWF Media TV
          </h1>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 font-display text-[clamp(1.5rem,3vw,2.25rem)] text-white/90">
            Where culture goes viral.
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <p className="mt-5 max-w-xl text-base md:text-lg text-white/65 leading-relaxed">
            Premium interviews, music videos, and viral content distributed globally.
          </p>
        </Reveal>
        <Reveal delay={0.35}>
          <div className="mt-10 flex flex-wrap gap-3">
            <RouterLink
              to="/studio"
              className="inline-flex items-center gap-2 bg-white text-black hover:bg-white/90 px-6 py-3 rounded-full text-sm font-medium transition-colors"
            >
              Book a Shoot
              <ArrowUpRight size={16} />
            </RouterLink>
            <a
              href={YT_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 px-6 py-3 rounded-full text-sm font-medium backdrop-blur transition-colors"
            >
              <Play size={15} className="fill-white" />
              Watch on YouTube
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- social proof ---------- */

function SocialProof() {
  return (
    <section className="border-y border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10 flex items-center justify-center">
        <p className="text-center text-[13px] md:text-sm text-white/70 tracking-wide">
          <span className="text-white font-medium">686M+ Views</span>
          <span className="mx-3 text-white/25">•</span>
          <span className="text-white font-medium">324K+ Subscribers</span>
          <span className="mx-3 text-white/25">•</span>
          <span className="text-white font-medium">Global audience reach</span>
        </p>
      </div>
    </section>
  );
}

/* ---------- what we do ---------- */

const services = [
  { icon: Mic, title: "Artist Interviews", desc: "Long-form conversations with the artists shaping the culture." },
  { icon: Film, title: "Music Videos", desc: "Cinematic music videos built for replay value." },
  { icon: Flame, title: "Viral Clips", desc: "Short-form content engineered for distribution." },
  { icon: Clapperboard, title: "Behind the Scenes", desc: "Raw access — the moments that build the story." },
];

function WhatWeDo() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <Reveal>
          <p className="text-[11px] tracking-[0.4em] text-white/45 mb-4">What we do</p>
          <h2 className="font-display text-4xl md:text-6xl text-white max-w-2xl leading-[1.05]">
            A full-stack content studio.
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.05}>
              <div className="h-full bg-[#0B0B0B] p-8 group hover:bg-[#101010] transition-colors">
                <s.icon size={22} className="text-white/80 mb-6" strokeWidth={1.5} />
                <h3 className="text-white text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- featured content ---------- */

const featured = [
  { img: viralThumbs, title: "Viral interviews", tag: "Series" },
  { img: musicVideo, title: "Music videos", tag: "Originals" },
  { img: audience, title: "Live & events", tag: "Coverage" },
];

function Featured() {
  return (
    <section className="py-24 md:py-32 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <p className="text-[11px] tracking-[0.4em] text-white/45 mb-4">Featured</p>
              <h2 className="font-display text-4xl md:text-6xl text-white leading-[1.05]">Latest from the network.</h2>
            </div>
            <a
              href={YT_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            >
              View all on YouTube <ArrowUpRight size={15} />
            </a>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featured.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <a
                href={YT_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative aspect-video overflow-hidden rounded-lg bg-white/5"
              >
                <img
                  src={f.img}
                  alt={f.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full bg-white/95 text-black flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <Play size={20} className="fill-black ml-0.5" />
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                  <h3 className="text-white text-lg font-medium">{f.title}</h3>
                  <span className="text-[10px] tracking-[0.25em] text-white/60 uppercase">{f.tag}</span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- why it works ---------- */

function WhyItWorks() {
  return (
    <section className="py-24 md:py-32 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6 md:px-10 text-center">
        <Reveal>
          <p className="text-[11px] tracking-[0.4em] text-white/45 mb-6">Why it works</p>
          <p className="font-display text-3xl md:text-5xl text-white leading-[1.15]">
            We turn culture into viral moments through high-impact storytelling and global distribution across YouTube,
            TikTok, Instagram, and streaming platforms.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- final cta ---------- */

function FinalCTA() {
  return (
    <section
      className="relative py-32 md:py-40 border-t border-white/5 overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.95)), url(${grunge})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="relative max-w-4xl mx-auto px-6 md:px-10 text-center">
        <Reveal>
          <h2 className="font-display text-5xl md:text-7xl text-white leading-[1.05]">Ready to go viral?</h2>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-10">
            <RouterLink
              to="/studio"
              className="inline-flex items-center gap-2 bg-white text-black hover:bg-white/90 px-7 py-3.5 rounded-full text-sm font-medium transition-colors"
            >
              Book a Shoot
              <ArrowUpRight size={16} />
            </RouterLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={bwfLogo} alt="BWF Media TV" className="w-8 h-8 object-contain" />
          <span className="text-sm text-white/60">© {new Date().getFullYear()} BWF Media TV</span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href={YT_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="text-white/60 hover:text-white transition-colors"
          >
            <Youtube size={18} />
          </a>
          <a
            href="https://www.instagram.com/bwfmediatv"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-white/60 hover:text-white transition-colors"
          >
            <Instagram size={18} />
          </a>
          <RouterLink to="/deck" className="text-sm text-white/60 hover:text-white transition-colors">
            Pitch Deck
          </RouterLink>
        </div>
      </div>
    </footer>
  );
}

/* ---------- main ---------- */

export function OnePager() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <SocialProof />
      <WhatWeDo />
      <Featured />
      <WhyItWorks />
      <FinalCTA />
      <Footer />
    </div>
  );
}