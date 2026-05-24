import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  Users,
  Eye,
  ThumbsUp,
  Flame,
  MessageCircle,
  Share2,
  ArrowRight,
  Sparkles,
  Radio,
} from "lucide-react";

/* ---------- Animated counter ---------- */

function Counter({
  to,
  decimals = 0,
  suffix = "",
  duration = 2.2,
}: {
  to: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) =>
    v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, to, duration, mv]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

/* ---------- Stats ---------- */

type Stat = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  display: string;
};

const STATS: Stat[] = [
  { icon: Users, label: "Subscribers", value: 329044, display: "329,044" },
  { icon: Eye, label: "Total Views", value: 703.9, decimals: 1, suffix: "M", display: "703.9M" },
  { icon: ThumbsUp, label: "Likes", value: 18.3, decimals: 1, suffix: "M", display: "18.3M" },
  { icon: Flame, label: "Recent Views", value: 6.6, decimals: 1, suffix: "M", display: "6.6M" },
  { icon: MessageCircle, label: "Comments", value: 771, suffix: "K", display: "771K" },
  { icon: Share2, label: "Shares", value: 3.0, decimals: 1, suffix: "M", display: "3.0M" },
];

const MILESTONES = [
  "703.9M lifetime views milestone reached",
  "Viral interview crosses 12M views in 72 hours",
  "329K+ subscribers and climbing daily",
  "Featured on global hip-hop trending charts",
  "Off The Block hits #1 in cultural commentary",
  "BWF Red Mic ranked top podcast on iHeart",
  "6.6M new views in the last 7 days",
  "771K comments across the BWF network",
];

const PARTNERS = [
  "YouTube",
  "iHeart",
  "TikTok",
  "Instagram",
  "Spotify",
  "Apple Music",
  "Meta",
  "Shorts",
];


/* ---------- Section ---------- */

export function GrowthShowcase() {
  return (
    <section
      id="growth"
      className="relative bg-gradient-to-b from-black via-[#070000] to-black border-b border-white/10 overflow-hidden"
    >
      {/* ambient glows */}
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--blood) 0%, transparent 60%)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--blood-glow) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32">
        {/* Header */}
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-blood/40 bg-blood/10 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blood opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blood" />
            </span>
            <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-bone">
              Live Growth
            </span>
            <span className="text-bone/40">•</span>
            <span className="font-cond tracking-[0.2em] text-[10px] uppercase text-bone/60">
              Performance Update · May 14 – May 21
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl uppercase text-bone leading-[0.95]"
          >
            BWFMedia Continues{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-blood)" }}
            >
              Massive Digital Growth
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-5 text-bone/65 text-base md:text-lg leading-relaxed max-w-2xl"
          >
            Millions of viewers, high engagement, and rapidly growing audience reach across digital
            platforms.
          </motion.p>
        </div>

        {/* Stat grid */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="group relative bg-black p-6 md:p-8 overflow-hidden hover:bg-white/[0.03] transition-colors"
            >
              <div
                aria-hidden
                className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(400px circle at 50% 0%, rgba(255,45,45,0.18), transparent 60%)",
                }}
              />
              <div className="relative flex items-center justify-between mb-5">
                <div className="w-10 h-10 flex items-center justify-center bg-blood/10 border border-blood/30 group-hover:bg-blood group-hover:border-blood transition-colors">
                  <s.icon size={18} className="text-blood group-hover:text-white transition-colors" />
                </div>
                <span className="font-cond tracking-[0.25em] text-[10px] uppercase text-bone/40">
                  Live
                </span>
              </div>
              <div className="relative font-display text-4xl md:text-5xl lg:text-6xl text-bone leading-none">
                <Counter
                  to={s.value}
                  decimals={s.decimals ?? 0}
                  suffix={s.suffix ?? ""}
                />
              </div>
              <div className="relative mt-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone/55">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Activity ticker */}
        <div className="mt-14 relative border border-blood/30 bg-black/60 backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-blood/20 bg-blood/5">
            <Radio size={14} className="text-blood animate-pulse" />
            <span className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase text-blood">
              Activity Ticker
            </span>
            <span className="text-bone/30 text-xs">·</span>
            <span className="font-cond tracking-[0.2em] text-[10px] uppercase text-bone/50">
              Milestones & Viral Moments
            </span>
          </div>
          <div className="relative py-4 group">
            <div className="flex gap-12 animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap w-max">
              {[...MILESTONES, ...MILESTONES].map((m, i) => (
                <div key={i} className="flex items-center gap-3 shrink-0">
                  <Sparkles size={14} className="text-blood" />
                  <span className="font-cond tracking-[0.15em] text-xs md:text-sm uppercase text-bone/80">
                    {m}
                  </span>
                  <span className="ml-8 h-1.5 w-1.5 rounded-full bg-blood/60" aria-hidden />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black to-transparent" />
          </div>
        </div>


        {/* Brands & Partnerships */}
        <div className="mt-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="block h-px w-10 bg-blood" />
            <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">
              Brands & Partnerships
            </span>
          </div>
          <h3 className="font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95] max-w-3xl">
            Distributed everywhere culture lives.
          </h3>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-white/10 border border-white/10">
            {PARTNERS.map((p, i) => (
              <motion.div
                key={p}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                className="bg-black h-20 flex items-center justify-center hover:bg-white/[0.04] transition-colors"
              >
                <span className="font-cond font-bold tracking-[0.25em] text-xs uppercase text-bone/60 hover:text-bone transition-colors">
                  {p}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-20 p-10 md:p-14 border border-blood/40 bg-gradient-to-br from-blood/10 via-black to-black overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--blood) 0%, transparent 60%)" }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="font-cond font-bold tracking-[0.4em] text-[11px] uppercase text-blood">
                Work With BWFMedia
              </span>
              <h3 className="mt-4 font-display text-3xl md:text-5xl uppercase text-bone leading-[0.95]">
                Plug into the engine moving culture.
              </h3>
            </div>
            <RouterLink
              to="/contact"
              className="group inline-flex items-center gap-3 px-8 py-5 bg-blood text-white font-cond font-bold tracking-[0.25em] text-xs uppercase hover:bg-blood-glow transition-colors shadow-[0_20px_60px_-20px_rgba(255,45,45,0.7)]"
            >
              Work With BWFMedia
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </RouterLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default GrowthShowcase;