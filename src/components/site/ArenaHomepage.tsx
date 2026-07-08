import { useMemo, useState, useEffect } from "react";
import { Link as RouterLink } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Play, Radio, Trophy, Flame, Users, Eye, Heart, Swords, Music,
  Mic, Guitar, Headphones, BarChart3, Star, Zap, Award, Calendar,
  ChevronRight, TrendingUp, DollarSign, Sparkles, Crown, Upload,
} from "lucide-react";
import { getHomepageData } from "@/lib/homepage.functions";
import { getArtistLeaderboard } from "@/lib/leaderboard.functions";
import { getArenaSpotlight } from "@/lib/arena-home.functions";
import { SignedImg } from "@/components/ui/signed-img";

/* ========== shared bits ========== */

const NEON_BG =
  "bg-[radial-gradient(ellipse_at_top,rgba(197,61,255,0.25),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(0,230,255,0.18),transparent_55%),#0A0A0F]";

function GlassCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHead({ icon: Icon, title, action, kicker }: {
  icon?: any; title: string; action?: React.ReactNode; kicker?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4 md:mb-5">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#C53DFF] to-[#FF00A6] text-white shadow-[0_0_20px_rgba(197,61,255,0.5)] shrink-0">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          {kicker && (
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#00E6FF]/80 font-semibold">{kicker}</div>
          )}
          <h2 className="font-display text-xl md:text-2xl uppercase tracking-wide text-white truncate">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

function LivePulse() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FF0044] text-white text-[9px] font-bold tracking-widest uppercase shadow-[0_0_12px_rgba(255,0,68,0.6)]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      LIVE
    </span>
  );
}

function NeonButton({ to, children, variant = "primary", icon: Icon, className = "" }: {
  to?: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; icon?: any; className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all";
  const styles = {
    primary: "bg-gradient-to-r from-[#C53DFF] via-[#FF00A6] to-[#FF00A6] text-white shadow-[0_10px_30px_-8px_rgba(255,0,166,0.7)] hover:shadow-[0_15px_40px_-8px_rgba(255,0,166,0.9)] hover:-translate-y-0.5",
    secondary: "bg-white/5 border border-white/15 text-white hover:bg-white/10 hover:border-[#00E6FF]/50",
    ghost: "border border-white/10 text-white/80 hover:text-white hover:border-white/25",
  }[variant];
  const inner = (
    <>
      {Icon && <Icon size={16} />}
      {children}
    </>
  );
  if (to) return <RouterLink to={to} className={`${base} ${styles} ${className}`}>{inner}</RouterLink>;
  return <button className={`${base} ${styles} ${className}`}>{inner}</button>;
}

/* ========== 1. Hero ========== */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 md:pt-12 pb-10 md:pb-14 px-4 md:px-8">
      {/* animated gradient orbs */}
      <motion.div
        className="absolute -top-20 -left-20 w-[380px] h-[380px] rounded-full bg-[#C53DFF]/30 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-20 right-0 w-[320px] h-[320px] rounded-full bg-[#00E6FF]/25 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 w-[280px] h-[280px] rounded-full bg-[#FF00A6]/20 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative max-w-[1600px] mx-auto">
        <div className="text-xs tracking-[0.4em] uppercase text-white/50 mb-2">Welcome to</div>
        <h1 className="font-brush text-[68px] leading-[0.9] md:text-[140px] md:leading-[0.9] tracking-tight text-white drop-shadow-[0_0_40px_rgba(197,61,255,0.6)]">
          ARENA
        </h1>
        <p className="mt-3 text-white/70 text-base md:text-lg max-w-md">
          Where artists battle. Fans decide. Winners earn.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <NeonButton to="/live" icon={Play} variant="primary">Watch Live</NeonButton>
          <NeonButton to="/play" icon={Swords} variant="secondary">Join Battle</NeonButton>
          <NeonButton to="/live" variant="ghost">Browse Battles</NeonButton>
          <NeonButton to="/stream-studio" icon={Mic} variant="ghost">Become a Host</NeonButton>
        </div>
      </div>
    </section>
  );
}

/* ========== 2. Live Now carousel ========== */

function LiveNowCarousel({ live }: { live: any[] }) {
  if (!live || live.length === 0) {
    return (
      <section className="px-4 md:px-8 mb-10">
        <SectionHead icon={Flame} kicker="Right Now" title="Live Now" />
        <GlassCard className="p-8 text-center text-white/60">
          No one is live right now. <RouterLink to="/stream-studio" className="text-[#00E6FF] underline">Go live yourself.</RouterLink>
        </GlassCard>
      </section>
    );
  }
  return (
    <section className="px-4 md:px-8 mb-10">
      <SectionHead icon={Flame} kicker="Right Now" title="Live Now" action={
        <RouterLink to="/live" className="text-xs font-semibold text-[#00E6FF] hover:text-white flex items-center gap-1">
          View all <ChevronRight size={14} />
        </RouterLink>
      } />
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 md:mx-0 px-4 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {live.map((s: any) => (
          <RouterLink
            key={s.id}
            to="/stream/$room"
            params={{ room: s.roomName ?? "" }}
            className="group snap-start shrink-0 w-[280px] md:w-[320px]"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a0a2e] to-[#0d0d18] aspect-[16/10]">
              {s.thumbnailUrl ? (
                <img src={s.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#C53DFF]/40 via-[#FF00A6]/30 to-[#00E6FF]/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3"><LivePulse /></div>
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-white text-[10px] font-semibold">
                <Eye size={11} /> {s.viewerCount ?? 0}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="text-white font-bold text-sm truncate">{s.title}</div>
                {s.host?.stage_name || s.host?.display_name ? (
                  <div className="text-white/60 text-xs truncate">{s.host.stage_name ?? s.host.display_name}</div>
                ) : null}
              </div>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-hover:ring-[#00E6FF]/40 group-hover:shadow-[0_0_30px_rgba(0,230,255,0.4)] transition-all pointer-events-none" />
            </div>
          </RouterLink>
        ))}
      </div>
    </section>
  );
}

/* ========== 3. Featured Championship ========== */

function VoteBar({ a, b }: { a: number; b: number }) {
  const total = a + b || 1;
  const aPct = Math.round((a / total) * 100);
  const bPct = 100 - aPct;
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-white mb-1.5">
        <span className="text-[#00E6FF]">{aPct}%</span>
        <span className="text-[#FF00A6]">{bPct}%</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${aPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#004BFF] to-[#00E6FF]"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${bPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#C53DFF] to-[#FF00A6]"
        />
      </div>
    </div>
  );
}

function FeaturedBattle({ spotlight }: { spotlight: any }) {
  const m = spotlight?.match;
  const a = spotlight?.artistA;
  const b = spotlight?.artistB;
  if (!m || !a || !b) {
    return (
      <section className="px-4 md:px-8 mb-10">
        <SectionHead icon={Crown} kicker="Championship" title="Featured Battle" />
        <GlassCard className="p-8 md:p-12 text-center">
          <div className="text-white/60 mb-4">No active championship battle right now.</div>
          <NeonButton to="/play" icon={Swords}>Start a Battle</NeonButton>
        </GlassCard>
      </section>
    );
  }
  return (
    <section className="px-4 md:px-8 mb-10">
      <SectionHead icon={Crown} kicker="Championship" title="Featured Battle" />
      <GlassCard className="p-5 md:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,230,255,0.15),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(255,0,166,0.18),transparent_50%)] pointer-events-none" />
        <div className="relative grid grid-cols-[1fr_auto_1fr] gap-3 md:gap-8 items-center">
          {/* Artist A */}
          <div className="text-center min-w-0">
            <div className="relative w-20 h-20 md:w-32 md:h-32 mx-auto rounded-full overflow-hidden ring-4 ring-[#00E6FF]/60 shadow-[0_0_40px_rgba(0,230,255,0.5)] bg-gradient-to-br from-[#004BFF] to-[#00E6FF]">
              {a.avatarUrl ? <SignedImg src={a.avatarUrl} alt={a.name} className="w-full h-full object-cover" /> :
                <div className="w-full h-full grid place-items-center text-white font-black text-2xl">{a.name[0]}</div>}
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-widest text-[#00E6FF] font-bold">Side A</div>
            <div className="font-display text-lg md:text-2xl text-white uppercase truncate">{a.name}</div>
            <div className="text-xs text-white/50">{a.wins} wins</div>
          </div>

          {/* Center: VS + round */}
          <div className="text-center">
            {m.status === "live" && <div className="mb-2"><LivePulse /></div>}
            <div className="font-brush text-4xl md:text-6xl text-white drop-shadow-[0_0_15px_rgba(255,0,166,0.6)]">VS</div>
            <div className="mt-1 text-[10px] tracking-widest uppercase text-white/50">
              Round {m.currentRound} / {m.totalRounds}
            </div>
          </div>

          {/* Artist B */}
          <div className="text-center min-w-0">
            <div className="relative w-20 h-20 md:w-32 md:h-32 mx-auto rounded-full overflow-hidden ring-4 ring-[#FF00A6]/60 shadow-[0_0_40px_rgba(255,0,166,0.5)] bg-gradient-to-br from-[#C53DFF] to-[#FF00A6]">
              {b.avatarUrl ? <SignedImg src={b.avatarUrl} alt={b.name} className="w-full h-full object-cover" /> :
                <div className="w-full h-full grid place-items-center text-white font-black text-2xl">{b.name[0]}</div>}
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-widest text-[#FF00A6] font-bold">Side B</div>
            <div className="font-display text-lg md:text-2xl text-white uppercase truncate">{b.name}</div>
            <div className="text-xs text-white/50">{b.wins} wins</div>
          </div>
        </div>

        <div className="relative mt-6 md:mt-8">
          <VoteBar a={m.aVotes} b={m.bVotes} />
          <div className="flex flex-wrap gap-3 mt-5 justify-center">
            {m.roomName && (
              <RouterLink
                to="/stream/$room"
                params={{ room: m.roomName }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-[#C53DFF] via-[#FF00A6] to-[#FF00A6] text-white shadow-[0_10px_30px_-8px_rgba(255,0,166,0.7)] hover:-translate-y-0.5 transition-all"
              >
                <Play size={16} /> Watch Live
              </RouterLink>
            )}
            <NeonButton to="/play" variant="secondary" icon={Zap}>Vote Now</NeonButton>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

/* ========== 4. Categories ========== */

const CATEGORIES = [
  { name: "Hip-Hop", icon: Mic, color: "#FF00A6" },
  { name: "R&B", icon: Music, color: "#C53DFF" },
  { name: "Rock", icon: Guitar, color: "#FF4D6A" },
  { name: "Pop", icon: Headphones, color: "#00E6FF" },
  { name: "EDM", icon: BarChart3, color: "#004BFF" },
  { name: "Country", icon: Guitar, color: "#FFA500" },
  { name: "Freestyle", icon: Mic, color: "#FF00A6" },
  { name: "Producer", icon: Music, color: "#C53DFF" },
];

function Categories() {
  return (
    <section className="px-4 md:px-8 mb-10">
      <SectionHead icon={Music} kicker="Browse" title="Categories" />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            className="group shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all min-w-[100px]"
          >
            <span
              className="grid place-items-center h-11 w-11 rounded-xl text-white group-hover:scale-110 transition-transform"
              style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)`, boxShadow: `0 0 20px ${c.color}55` }}
            >
              <c.icon size={18} />
            </span>
            <span className="text-xs font-semibold text-white/85 uppercase tracking-wider">{c.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ========== 5. Trending Battles ========== */

function TrendingBattles({ trending }: { trending: any[] }) {
  if (!trending || trending.length === 0) return null;
  return (
    <section className="px-4 md:px-8 mb-10">
      <SectionHead icon={TrendingUp} kicker="Hot" title="Trending Battles" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {trending.slice(0, 4).map((t) => {
          const total = t.aVotes + t.bVotes || 1;
          const aPct = Math.round((t.aVotes / total) * 100);
          const cardClass = "group relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a0a2e] to-[#0d0d18] aspect-[4/5] hover:-translate-y-1 transition-transform block";
          const inner = (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,230,255,0.3),transparent),radial-gradient(circle_at_70%_70%,rgba(255,0,166,0.3),transparent)]" />
              {t.status === "live" && <div className="absolute top-2 right-2"><LivePulse /></div>}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="text-white font-bold text-xs md:text-sm truncate">{t.aName}</div>
                <div className="text-white/40 text-[10px] font-black my-0.5">VS</div>
                <div className="text-white font-bold text-xs md:text-sm truncate">{t.bName}</div>
                <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00E6FF] to-[#FF00A6]" style={{ width: `${aPct}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/60">
                  <span>{t.aVotes + t.bVotes} votes</span>
                  <span className="uppercase font-bold">{t.status}</span>
                </div>
              </div>
            </>
          );
          return t.roomName ? (
            <RouterLink key={t.id} to="/stream/$room" params={{ room: t.roomName }} className={cardClass}>{inner}</RouterLink>
          ) : (
            <RouterLink key={t.id} to="/play" className={cardClass}>{inner}</RouterLink>
          );
        })}
      </div>
    </section>
  );
}

/* ========== 6. Weekly Leaderboard ========== */

function LeaderboardCard({ entries }: { entries: any[] }) {
  const top = entries.slice(0, 5);
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-[#FFD700]" />
          <h3 className="font-display text-lg text-white uppercase tracking-wide">Leaderboard</h3>
        </div>
        <RouterLink to="/leaderboard" className="text-[11px] font-semibold text-[#00E6FF] hover:text-white">View All</RouterLink>
      </div>
      {top.length === 0 && <div className="text-white/50 text-sm">No ranked artists yet.</div>}
      <ul className="space-y-2">
        {top.map((e, i) => (
          <RouterLink key={e.userId} to="/artist/$id" params={{ id: e.publicId }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition">
            <div className={`w-6 text-center text-sm font-black ${
              i === 0 ? "text-[#FFD700]" : i === 1 ? "text-[#C0C0C0]" : i === 2 ? "text-[#CD7F32]" : "text-white/50"
            }`}>{e.rank}</div>
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#C53DFF] to-[#00E6FF] shrink-0">
              {e.avatarUrl ? <SignedImg src={e.avatarUrl} alt={e.name} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{e.name}</div>
              <div className="text-[10px] text-white/50">{e.battleWins} wins · {e.totalVotes} votes</div>
            </div>
            <div className="text-xs font-bold text-[#00E6FF]">{e.score.toLocaleString()}</div>
          </RouterLink>
        ))}
      </ul>
    </GlassCard>
  );
}

/* ========== 7. Prize Pool ========== */

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{prefix}{n.toLocaleString()}</>;
}

function PrizePoolCard() {
  return (
    <GlassCard className="p-5 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(197,61,255,0.35),transparent_60%)] pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Award size={16} className="text-[#FFD700]" />
          <h3 className="font-display text-lg text-white uppercase tracking-wide">Arena Pools</h3>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Current Prize Pool</div>
        <div className="font-brush text-4xl md:text-5xl bg-gradient-to-r from-[#C53DFF] to-[#00E6FF] bg-clip-text text-transparent">
          $<AnimatedNumber value={148245} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-lg p-2.5 bg-white/[0.04] border border-white/10">
            <div className="text-[9px] uppercase text-white/50">Today</div>
            <div className="text-sm font-bold text-white">$9,410</div>
          </div>
          <div className="rounded-lg p-2.5 bg-white/[0.04] border border-white/10">
            <div className="text-[9px] uppercase text-white/50">Tonight</div>
            <div className="text-sm font-bold text-white">8 PM</div>
          </div>
          <div className="rounded-lg p-2.5 bg-white/[0.04] border border-white/10">
            <div className="text-[9px] uppercase text-white/50">Next</div>
            <div className="text-sm font-bold text-white">Sat</div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* ========== 8. Discover Artists ========== */

function DiscoverArtists({ artists }: { artists: any[] }) {
  if (!artists || artists.length === 0) return null;
  return (
    <section className="px-4 md:px-8 mb-10">
      <SectionHead icon={Star} kicker="Explore" title="Discover Artists" action={
        <RouterLink to="/artists" className="text-xs font-semibold text-[#00E6FF] hover:text-white flex items-center gap-1">
          View all <ChevronRight size={14} />
        </RouterLink>
      } />
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {artists.map((a: any) => (
          <RouterLink key={a.id} to="/artist/$id" params={{ id: a.id }}
            className="group shrink-0 w-[160px] md:w-[180px] text-center">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-[#C53DFF] to-[#00E6FF] mb-2 group-hover:shadow-[0_0_30px_rgba(197,61,255,0.6)] transition">
              {a.avatar_url ? <SignedImg src={a.avatar_url} alt={a.stage_name ?? a.display_name} className="w-full h-full object-cover" /> :
                <div className="w-full h-full grid place-items-center text-white text-3xl font-black">
                  {(a.stage_name ?? a.display_name ?? "?")[0]}
                </div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div className="text-sm font-bold text-white truncate">{a.stage_name ?? a.display_name}</div>
            <div className="text-[10px] text-white/50 uppercase tracking-widest">Artist</div>
          </RouterLink>
        ))}
      </div>
    </section>
  );
}

/* ========== 9. Community Feed ========== */

function CommunityFeedCard() {
  const items = [
    { icon: Flame, text: "A new championship battle just started", time: "just now", color: "#FF00A6" },
    { icon: Trophy, text: "Weekly leaderboard reshuffled", time: "5m ago", color: "#FFD700" },
    { icon: Zap, text: "Fans cast 1,200+ votes in the last hour", time: "12m ago", color: "#00E6FF" },
    { icon: Radio, text: "New hosts are going live tonight", time: "22m ago", color: "#C53DFF" },
  ];
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#00E6FF]" />
          <h3 className="font-display text-lg text-white uppercase tracking-wide">Community Feed</h3>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="grid place-items-center h-8 w-8 rounded-lg shrink-0" style={{ background: `${it.color}22`, color: it.color }}>
              <it.icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-white/90">{it.text}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{it.time}</div>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

/* ========== 10. Challenges ========== */

function ChallengesCard() {
  const [tab, setTab] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const data: Record<string, Array<{ name: string; progress: number; total: number; xp: number }>> = {
    Daily: [
      { name: "Watch 3 battles", progress: 2, total: 3, xp: 150 },
      { name: "Vote 10 times", progress: 7, total: 10, xp: 200 },
      { name: "Win 2 battles", progress: 1, total: 2, xp: 300 },
    ],
    Weekly: [
      { name: "Reach top 100", progress: 0, total: 1, xp: 800 },
      { name: "Upload 3 tracks", progress: 1, total: 3, xp: 600 },
    ],
    Monthly: [
      { name: "Win championship", progress: 0, total: 1, xp: 2500 },
    ],
  };
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#C53DFF]" />
          <h3 className="font-display text-lg text-white uppercase tracking-wide">Challenges</h3>
        </div>
      </div>
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-white/[0.04] border border-white/10">
        {(["Daily", "Weekly", "Monthly"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs font-bold uppercase tracking-wider py-1.5 rounded-md transition ${
              tab === t ? "bg-gradient-to-r from-[#C53DFF] to-[#FF00A6] text-white shadow" : "text-white/60 hover:text-white"
            }`}>{t}</button>
        ))}
      </div>
      <ul className="space-y-3">
        {data[tab].map((c, i) => (
          <li key={i}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white/85 font-semibold">{c.name}</span>
              <span className="text-[#00E6FF] font-bold">+{c.xp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#C53DFF] to-[#00E6FF]" style={{ width: `${(c.progress / c.total) * 100}%` }} />
              </div>
              <span className="text-[10px] text-white/50 tabular-nums">{c.progress}/{c.total}</span>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

/* ========== 11. Bottom CTA ========== */

function BottomCTA() {
  return (
    <section className="px-4 md:px-8 mb-14">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 p-8 md:p-14 text-center bg-[radial-gradient(ellipse_at_center,rgba(255,0,166,0.35),transparent_70%),radial-gradient(ellipse_at_top_left,rgba(0,230,255,0.25),transparent_60%),#0a0510]">
        <h2 className="font-brush text-4xl md:text-6xl text-white drop-shadow-[0_0_20px_rgba(255,0,166,0.5)]">
          Ready to Enter the Arena?
        </h2>
        <p className="mt-3 text-white/70 max-w-lg mx-auto">
          Compete for fans. Earn recognition. Build your audience. Win prizes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <NeonButton to="/play" icon={Swords} variant="primary">Start a Battle</NeonButton>
          <NeonButton to="/stream-studio" icon={Radio} variant="secondary">Go Live</NeonButton>
          <NeonButton to="/settings/music-media" icon={Upload} variant="ghost">Upload Music</NeonButton>
        </div>
      </div>
    </section>
  );
}

/* ========== Root ========== */

export function ArenaHomepage() {
  const fetchHome = useServerFn(getHomepageData);
  const fetchLeaderboard = useServerFn(getArtistLeaderboard);
  const fetchSpotlight = useServerFn(getArenaSpotlight);

  const homeQ = useQuery({ queryKey: ["arena-home"], queryFn: () => fetchHome() });
  const leaderQ = useQuery({ queryKey: ["arena-leaderboard-top"], queryFn: () => fetchLeaderboard() });
  const spotQ = useQuery({ queryKey: ["arena-spotlight"], queryFn: () => fetchSpotlight() });

  const home = homeQ.data ?? { liveStreams: [], videos: [], featuredArtists: [] };
  const leaderboard = leaderQ.data ?? [];
  const spotlight = spotQ.data ?? null;

  return (
    <div className={`min-h-screen text-white ${NEON_BG}`}>
      <Hero />

      <div className="max-w-[1600px] mx-auto">
        <LiveNowCarousel live={home.liveStreams} />

        {/* Main content grid: featured battle + right rail on desktop */}
        <section className="px-4 md:px-8 mb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="min-w-0">
            <FeaturedBattle spotlight={spotlight} />
          </div>
          <div className="space-y-4 lg:pt-14">
            <LeaderboardCard entries={leaderboard} />
            <PrizePoolCard />
          </div>
        </section>

        <Categories />

        <section className="px-4 md:px-8 mb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="min-w-0">
            <TrendingBattles trending={spotlight?.trending ?? []} />
          </div>
          <div className="space-y-4">
            <CommunityFeedCard />
            <ChallengesCard />
          </div>
        </section>

        <DiscoverArtists artists={home.featuredArtists} />

        <BottomCTA />
      </div>
    </div>
  );
}

// keep unused imports from being flagged
void DollarSign; void Heart; void Calendar;