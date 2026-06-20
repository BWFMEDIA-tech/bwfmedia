import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic2,
  Swords,
  Trophy,
  Music2,
  Users,
  Flame,
  Crown,
  Zap,
  Target,
  Radio,
  Eye,
  Calendar,
  CheckCircle2,
  Sparkles,
  Gem,
  Medal,
  Award,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "Play Arena — BWF Network" },
      {
        name: "description",
        content:
          "The stage is earned, not given. Join queues, win battles, climb ranks in the BWF Play Arena.",
      },
    ],
  }),
  component: PlayArenaDashboard,
});

function PlayArenaDashboard() {
  return (
    <div className="min-h-screen bg-[#06060d] text-white pt-20 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <ProfileHero />
        <ChoosePath />
        <LiveArenaStatus />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EarnXp />
          <RankProgression />
          <PowerUps />
        </div>
        <ArenaPass />
        <PromoBanner />
      </div>
    </div>
  );
}

/* ---------- Profile Hero ---------- */
function ProfileHero() {
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#11111d] to-[#0a0a14] p-5 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-4 flex items-center gap-4">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-gradient-to-br from-[#C53DFF] to-[#FF00A6] flex items-center justify-center text-2xl font-black shrink-0">
            YW
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold truncate">YoungWave</h2>
              <CheckCircle2 className="h-5 w-5 text-[#00E6FF] shrink-0" />
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <Medal className="h-3.5 w-3.5" /> Bronze Performer
            </div>
            <p className="mt-2 text-sm text-white/60">Rising artist. Real music. Real energy.</p>
            <button className="mt-3 rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5">
              Edit Profile
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          <p className="text-[11px] font-bold tracking-widest text-white/50">XP PROGRESS</p>
          <p className="mt-1 text-2xl font-bold">
            1,240 <span className="text-base font-medium text-white/50">/ 2,000 XP</span>
            <span className="ml-2 text-sm text-[#00E6FF]">62%</span>
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#C53DFF] to-[#FF00A6]" />
          </div>
          <p className="mt-2 text-xs text-white/50 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#C53DFF]" />
            760 XP to reach <span className="text-white/80 font-semibold">Silver Artist</span>
          </p>
        </div>

        <div className="lg:col-span-2">
          <p className="text-[11px] font-bold tracking-widest text-white/50">RANK STATS</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" /> <span className="font-bold">8</span> <span className="text-white/50">WINS</span></p>
            <p className="flex items-center gap-2"><Flame className="h-4 w-4 text-[#FF00A6]" /> <span className="font-bold">3</span> <span className="text-white/50">WIN STREAK</span></p>
            <p className="flex items-center gap-2"><Swords className="h-4 w-4 text-[#00E6FF]" /> <span className="font-bold">24</span> <span className="text-white/50">BATTLES</span></p>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-2.5">
          <button className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#C53DFF] to-[#004BFF] px-4 py-3 text-left hover:shadow-[0_0_30px_-5px_#C53DFF80] transition">
            <Music2 className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold leading-tight">JOIN LIVE ARENA</p>
              <p className="text-xs text-white/80 leading-tight">Enter the arena. Earn your stage.</p>
            </div>
          </button>
          <button className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition">
            <Calendar className="h-5 w-5 shrink-0 text-[#00E6FF]" />
            <div className="min-w-0">
              <p className="font-bold leading-tight">VIEW UPCOMING EVENTS</p>
              <p className="text-xs text-white/60 leading-tight">See all scheduled competitions and live events.</p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Choose Your Path ---------- */
function ChoosePath() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5 sm:p-6">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/50">CHOOSE YOUR PATH TO THE ARENA</h3>
          <p className="mt-1 text-sm text-white/70">Artists don't go live. They earn their stage.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <PathCard
          accent="from-[#C53DFF]/30 to-transparent"
          ring="ring-[#C53DFF]/40"
          icon={<Mic2 className="h-6 w-6" />}
          iconColor="text-[#C53DFF]"
          title="OPEN STAGE QUEUE"
          desc={<>Join the queue for a chance to perform.<br />First come. First served.</>}
          metricLabel="Next Slot In"
          metricValue="08:45"
          metricColor="text-[#C53DFF]"
          button={{ label: "JOIN QUEUE", className: "bg-[#C53DFF] hover:bg-[#b02ee6]" }}
          footer={<>Your Position: <span className="font-bold text-white">#12</span></>}
        />
        <PathCard
          accent="from-[#00E6FF]/25 via-[#FF00A6]/20 to-transparent"
          ring="ring-[#00E6FF]/40"
          icon={<Swords className="h-6 w-6" />}
          iconColor="text-[#00E6FF]"
          title="1V1 BATTLE MATCH"
          desc={<>Get matched. Prove you're better.<br />Winner stays.</>}
          metricLabel="Find Opponent"
          metricValue="00:30"
          metricColor="text-[#00E6FF]"
          button={{ label: "FIND MATCH", className: "bg-[#004BFF] hover:bg-[#0040d9]" }}
          footer={<>Battles Today: <span className="font-bold text-white">3/10</span></>}
        />
        <PathCard
          accent="from-amber-500/25 to-transparent"
          ring="ring-amber-500/40"
          icon={<Trophy className="h-6 w-6" />}
          iconColor="text-amber-400"
          title="WEEKLY CHALLENGE"
          desc={<>Compete in scheduled events.<br />Win rewards. Climb ranks.</>}
          metricLabel="Next Event"
          metricValue="FRIDAY 8:00 PM"
          metricColor="text-amber-400"
          button={{ label: "VIEW CHALLENGES", className: "bg-amber-500 text-black hover:bg-amber-400" }}
          footer={<>Active Events: <span className="font-bold text-white">2</span></>}
        />
      </div>
    </section>
  );
}

function PathCard({
  accent,
  ring,
  icon,
  iconColor,
  title,
  desc,
  metricLabel,
  metricValue,
  metricColor,
  button,
  footer,
}: {
  accent: string;
  ring: string;
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  desc: React.ReactNode;
  metricLabel: string;
  metricValue: string;
  metricColor: string;
  button: { label: string; className: string };
  footer: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#11111d] p-5 ring-1 ${ring}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className={`rounded-lg bg-white/5 p-2 ${iconColor}`}>{icon}</div>
        </div>
        <h4 className="mt-3 text-lg font-bold">{title}</h4>
        <p className="mt-1 text-sm text-white/65 leading-snug">{desc}</p>

        <div className="mt-4">
          <p className="text-[11px] font-bold tracking-widest text-white/50">{metricLabel}</p>
          <p className={`text-2xl font-black mt-0.5 ${metricColor}`}>{metricValue}</p>
        </div>

        <button className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white transition ${button.className}`}>
          {button.label}
        </button>
        <p className="mt-3 text-xs text-white/50">{footer}</p>
      </div>
    </div>
  );
}

/* ---------- Live Arena Status ---------- */
function LiveArenaStatus() {
  const queue = [
    { n: 1, name: "NovaRex", status: "Now Performing", color: "text-emerald-400" },
    { n: 2, name: "J-Soul", status: "Up Next", color: "text-[#C53DFF]" },
    { n: 3, name: "KJ Blaze", status: "#3 In Queue", color: "text-white/50" },
    { n: 4, name: "LexX", status: "#4 In Queue", color: "text-white/50" },
    { n: 5, name: "Aura.wav", status: "#5 In Queue", color: "text-white/50" },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-bold tracking-widest text-white/50">LIVE ARENA STATUS</h3>
        <span className="text-xs text-white/50">Real-time overview of active events</span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Stage Queue */}
        <div className="rounded-xl border border-white/10 bg-[#11111d] p-4">
          <div className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-[#C53DFF]" />
            <p className="text-sm font-bold">ACTIVE STAGE QUEUE</p>
          </div>
          <p className="text-xs text-white/50 mt-0.5">Who's up next</p>
          <ul className="mt-3 space-y-2 text-sm">
            {queue.map((q) => (
              <li key={q.n} className="flex items-center gap-3">
                <span className="w-4 text-white/40 text-xs">{q.n}</span>
                <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[#C53DFF] to-[#004BFF] text-[10px] font-bold flex items-center justify-center">
                  {q.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{q.name}</span>
                <span className={`text-xs ${q.color} flex items-center gap-1`}>
                  {q.status === "Now Performing" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {q.status}
                </span>
              </li>
            ))}
          </ul>
          <button className="mt-4 w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:bg-white/5">
            VIEW FULL QUEUE
          </button>
        </div>

        {/* Live Battle Arena */}
        <div className="rounded-xl border border-white/10 bg-[#11111d] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-[#00E6FF]" />
              <p className="text-sm font-bold text-[#00E6FF]">LIVE BATTLE ARENA</p>
            </div>
            <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold">LIVE</span>
          </div>
          <div className="mt-5 flex items-center justify-around">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#00E6FF] to-[#004BFF] ring-2 ring-[#00E6FF]/60 flex items-center justify-center font-bold">AW</div>
              <p className="mt-2 text-sm font-bold">Aura.wav</p>
              <p className="text-[10px] text-amber-400">Bronze</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white/60">VS</p>
              <p className="mt-2 text-xs text-white/50">Round 2</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#FF00A6] to-red-600 ring-2 ring-red-500/60 flex items-center justify-center font-bold">KJ</div>
              <p className="mt-2 text-sm font-bold">KJ Blaze</p>
              <p className="text-[10px] text-amber-400">Bronze</p>
            </div>
          </div>
          <button className="mt-5 w-full rounded-lg bg-[#004BFF] px-3 py-2 text-xs font-bold hover:bg-[#0040d9]">
            WATCH NOW
          </button>
        </div>

        {/* Trending Live Room */}
        <div className="rounded-xl border border-white/10 bg-[#11111d] p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#FF00A6]" />
            <p className="text-sm font-bold">TRENDING LIVE ROOM</p>
          </div>
          <p className="text-xs text-white/50 mt-0.5">Top event right now</p>
          <div className="mt-3 aspect-video rounded-lg bg-gradient-to-br from-[#C53DFF]/40 via-[#FF00A6]/30 to-[#004BFF]/40 flex items-end p-3">
            <p className="font-bold">Weekly Challenge Finals</p>
          </div>
          <p className="mt-3 text-xs text-white/60 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> 1,245 Watching
          </p>
          <button className="mt-3 w-full rounded-lg bg-[#C53DFF] px-3 py-2 text-xs font-bold hover:bg-[#b02ee6]">
            JOIN ROOM
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Earn XP ---------- */
function EarnXp() {
  const items = [
    { icon: <Mic2 className="h-5 w-5" />, label: "Join Live Arena", xp: "+50 XP", sub: "Per Performance", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: <Music2 className="h-5 w-5" />, label: "Submit Track", xp: "+25 XP", sub: "Per Track", color: "text-[#C53DFF]", bg: "bg-[#C53DFF]/10" },
    { icon: <Swords className="h-5 w-5" />, label: "Win Battle", xp: "+200 XP", sub: "Per Victory", color: "text-[#00E6FF]", bg: "bg-[#00E6FF]/10" },
    { icon: <Users className="h-5 w-5" />, label: "Audience Votes", xp: "+1 XP", sub: "Per 10 Votes", color: "text-[#FF00A6]", bg: "bg-[#FF00A6]/10" },
    { icon: <Flame className="h-5 w-5" />, label: "Win Streak Bonus", xp: "+10%", sub: "XP Multiplier", color: "text-amber-400", bg: "bg-amber-500/10" },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5">
      <h3 className="text-xs font-bold tracking-widest text-white/50">EARN XP</h3>
      <p className="mt-1 text-sm text-white/70">Level up by performing, engaging and winning battles.</p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-white/10 bg-[#11111d] p-3 text-center">
            <div className={`mx-auto h-9 w-9 rounded-lg ${it.bg} ${it.color} flex items-center justify-center`}>{it.icon}</div>
            <p className="mt-2 text-[11px] font-semibold leading-tight">{it.label}</p>
            <p className={`mt-1 text-sm font-black ${it.color}`}>{it.xp}</p>
            <p className="text-[10px] text-white/50">{it.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Rank Progression ---------- */
function RankProgression() {
  const ranks = [
    { icon: <Medal className="h-5 w-5" />, label: "BRONZE PERFORMER", range: "0 – 1,999 XP", color: "text-amber-600", bg: "from-amber-700/40 to-amber-900/30" },
    { icon: <Award className="h-5 w-5" />, label: "SILVER ARTIST", range: "2,000 – 4,999 XP", color: "text-slate-300", bg: "from-slate-400/30 to-slate-600/20" },
    { icon: <Trophy className="h-5 w-5" />, label: "GOLD CREATOR", range: "5,000 – 9,999 XP", color: "text-amber-400", bg: "from-amber-400/30 to-amber-600/20" },
    { icon: <Gem className="h-5 w-5" />, label: "DIAMOND STAR", range: "10,000+ XP", color: "text-[#00E6FF]", bg: "from-[#00E6FF]/30 to-[#004BFF]/20" },
    { icon: <Crown className="h-5 w-5" />, label: "LEGEND", range: "Invite Only · Top 1%", color: "text-[#C53DFF]", bg: "from-[#C53DFF]/40 to-[#FF00A6]/20" },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5">
      <h3 className="text-xs font-bold tracking-widest text-white/50">RANK PROGRESSION</h3>
      <p className="mt-1 text-sm text-white/70">Climb the ranks. Earn respect.</p>
      <ul className="mt-4 space-y-2">
        {ranks.map((r) => (
          <li key={r.label} className={`flex items-center gap-3 rounded-lg border border-white/10 bg-gradient-to-r ${r.bg} px-3 py-2`}>
            <div className={`${r.color}`}>{r.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{r.label}</p>
              <p className="text-[10px] text-white/60">{r.range}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Power-Ups ---------- */
function PowerUps() {
  const items = [
    { icon: <Users className="h-5 w-5" />, title: "CROWD SURGE", desc: "Doubles XP from audience votes.", color: "text-[#C53DFF]", btn: "bg-[#C53DFF] hover:bg-[#b02ee6]" },
    { icon: <Target className="h-5 w-5" />, title: "PERFECT SET", desc: "Bonus XP for no skips.", color: "text-[#00E6FF]", btn: "bg-[#00E6FF] text-black hover:bg-cyan-300" },
    { icon: <Zap className="h-5 w-5" />, title: "FAST RISE", desc: "Temporary XP boost for new artists.", color: "text-emerald-400", btn: "bg-emerald-500 hover:bg-emerald-400 text-black" },
    { icon: <Crown className="h-5 w-5" />, title: "FEATURED SLOT", desc: "Get featured and gain massive exposure.", color: "text-amber-400", btn: "bg-amber-500 text-black hover:bg-amber-400" },
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5">
      <h3 className="text-xs font-bold tracking-widest text-white/50">POWER-UPS</h3>
      <p className="mt-1 text-sm text-white/70">Activate boosts. Dominate the arena.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((p) => (
          <div key={p.title} className="rounded-xl border border-white/10 bg-[#11111d] p-3">
            <div className={`h-8 w-8 rounded-lg bg-white/5 ${p.color} flex items-center justify-center`}>{p.icon}</div>
            <p className="mt-2 text-xs font-bold">{p.title}</p>
            <p className="mt-0.5 text-[10px] text-white/55 leading-snug min-h-[28px]">{p.desc}</p>
            <button className={`mt-2 w-full rounded-md px-2 py-1.5 text-[10px] font-bold ${p.btn}`}>ACTIVATE</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Arena Pass ---------- */
function ArenaPass() {
  const benefits = [
    "Priority Queue Access",
    "Exclusive Events",
    "Double XP Weekends",
    "Special Profile Badges",
    "Advanced Performance Analytics",
    "Early Access Features",
  ];
  return (
    <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#0a0a14] to-[#C53DFF]/10 p-5 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-3 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black">ARENA PASS</p>
            <p className="text-xs text-white/60">Unlock exclusive benefits and dominate the arena.</p>
          </div>
        </div>
        <ul className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2 text-white/80">
              <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="truncate">{b}</span>
            </li>
          ))}
        </ul>
        <div className="lg:col-span-4 grid grid-cols-2 gap-3">
          <button className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left hover:bg-amber-500/20">
            <p className="text-xs font-bold text-amber-300">ARENA PASS</p>
            <p className="text-lg font-black">$4.99<span className="text-xs font-normal text-white/60"> / month</span></p>
          </button>
          <button className="rounded-xl border border-[#C53DFF]/40 bg-[#C53DFF]/10 p-3 text-left hover:bg-[#C53DFF]/20">
            <p className="text-xs font-bold text-[#C53DFF]">ARENA PASS PRO</p>
            <p className="text-lg font-black">$9.99<span className="text-xs font-normal text-white/60"> / month</span></p>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Promo Banner ---------- */
function PromoBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#C53DFF]/30 via-[#FF00A6]/20 to-[#004BFF]/30 p-6 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,#FF00A640,transparent_60%)] pointer-events-none" />
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <h3 className="text-3xl sm:text-4xl font-black leading-tight">
            THE STAGE IS EARNED.<br />NOT GIVEN.
          </h3>
          <p className="mt-3 text-lg font-bold text-white/90">
            JOIN. COMPETE. GET DISCOVERED.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold tracking-wider">
            <span className="rounded-full bg-white/10 px-3 py-1">CURATED</span>
            <span className="rounded-full bg-white/10 px-3 py-1">COMPETITIVE</span>
            <span className="rounded-full bg-white/10 px-3 py-1">HIGH ENERGY</span>
          </div>
          <p className="mt-4 text-xs text-white/60 max-w-md">
            Every performance impacts rankings, visibility, and progression across the entire Play Arena ecosystem.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {["Scarcity", "Competition", "Authority", "Momentum"].map((w) => (
            <span key={w} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm font-bold">
              {w}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// Keep Link import alive for future routing wire-up
void Link;
void Radio;