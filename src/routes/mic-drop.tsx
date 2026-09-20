import { createFileRoute } from "@tanstack/react-router";
import { Mic, Flame, Trophy, Play, Heart, Calendar, Users, Sparkles, ChevronRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/mic-drop")({
  component: MicDropArena,
  head: () => ({
    meta: [
      { title: "Mic Drop Arena — BWF Network" },
      { name: "description", content: "Open mic battles, talent showdowns, and live audience voting on BWF Network." },
    ],
  }),
});

const BATTLERS = [
  { name: "JAY TRU", track: "No Turning Back", color: "from-red-600 to-pink-600", votes: 1247 },
  { name: "K. NOVA", track: "Skyline Dreams", color: "from-purple-600 to-indigo-600", votes: 982 },
];
const UPCOMING = [
  { date: "JUN 21", title: "Friday Night Cypher", entrants: 12 },
  { date: "JUN 28", title: "Producer vs Producer", entrants: 8 },
  { date: "JUL 05", title: "Indie Showcase Finals", entrants: 16 },
];
const LEADERS = [
  { rank: 1, name: "JAY TRU", wins: 14, streak: 7 },
  { rank: 2, name: "MAYA SOL", wins: 12, streak: 3 },
  { rank: 3, name: "K. NOVA", wins: 11, streak: 5 },
  { rank: 4, name: "RIO B", wins: 9, streak: 2 },
  { rank: 5, name: "ZENA", wins: 8, streak: 4 },
];

function MicDropArena() {
  const [voted, setVoted] = useState<number | null>(null);
  const total = BATTLERS[0].votes + BATTLERS[1].votes + (voted !== null ? 1 : 0);
  const pct = (i: number) => Math.round(((BATTLERS[i].votes + (voted === i ? 1 : 0)) / total) * 100);

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(229,9,20,0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(120,40,200,0.2),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-600/40 bg-red-600/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-400">
            <Flame className="h-3 w-3" /> Live Now
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            MIC DROP <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">ARENA</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            Open mic battles. Talent showdowns. Audience votes decide who advances. Drop your mic, claim your crown.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-red-500">
              <Mic className="h-4 w-4" /> Enter Battle
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white/10">
              <Play className="h-4 w-4" /> Watch Live
            </button>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-xs text-white/50">
            <Stat icon={<Users className="h-4 w-4 text-red-500" />} value="12.4K" label="Watching now" />
            <Stat icon={<Trophy className="h-4 w-4 text-red-500" />} value="$5,000" label="Tonight's prize" />
            <Stat icon={<Sparkles className="h-4 w-4 text-red-500" />} value="248" label="Battles this week" />
          </div>
        </div>
      </section>

      {/* Current Battle */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <SectionHeader title="Tonight's Battle" sub="Vote for the artist you want to advance. One vote per round." />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {BATTLERS.map((b, i) => (
            <button
              key={b.name}
              onClick={() => setVoted(i)}
              className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition ${voted === i ? "border-red-600 bg-red-600/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
            >
              <div className={`absolute -inset-0.5 -z-10 bg-gradient-to-br ${b.color} opacity-20 blur-2xl transition group-hover:opacity-40`} />
              <div className="flex items-center gap-4">
                <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br ${b.color} text-xl font-black`}>
                  {b.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-black">{b.name}</div>
                  <div className="truncate text-xs text-white/60">{b.track}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">{pct(i)}%</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{(BATTLERS[i].votes + (voted === i ? 1 : 0)).toLocaleString()} votes</div>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-gradient-to-r ${b.color} transition-all duration-500`} style={{ width: `${pct(i)}%` }} />
              </div>
              <div className={`mt-4 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${voted === i ? "bg-red-600 text-white" : "border border-white/15 bg-white/5 text-white/80"}`}>
                <Heart className={`h-3 w-3 ${voted === i ? "fill-white" : ""}`} /> {voted === i ? "Voted" : "Vote Now"}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Upcoming + Leaderboard */}
      <section className="mx-auto max-w-7xl px-6 pb-16 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <SectionHeader title="Upcoming Battles" />
          <div className="mt-4 space-y-2">
            {UPCOMING.map((u) => (
              <div key={u.title} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04]">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-red-500">{u.date.split(" ")[0]}</div>
                  <div className="text-lg font-black leading-none">{u.date.split(" ")[1]}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{u.title}</div>
                  <div className="text-xs text-white/50 flex items-center gap-1"><Calendar className="h-3 w-3" /> {u.entrants} entrants confirmed</div>
                </div>
                <button className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
                  Register <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <aside>
          <SectionHeader title="Top Mics" sub="This month's champions." />
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {LEADERS.map((l) => (
              <div key={l.name} className="flex items-center gap-3 p-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-black ${l.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-black" : l.rank === 2 ? "bg-zinc-400 text-black" : l.rank === 3 ? "bg-amber-700 text-black" : "bg-white/5 text-white/60"}`}>
                  {l.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{l.name}</div>
                  <div className="text-[11px] text-white/50">{l.wins} wins • {l.streak} win streak</div>
                </div>
                {l.rank === 1 && <Trophy className="h-4 w-4 text-yellow-400" />}
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-red-600/40 bg-gradient-to-br from-red-600/20 to-pink-600/10 p-5">
            <Mic className="h-6 w-6 text-red-500" />
            <div className="mt-3 text-lg font-black">Drop Your Mic</div>
            <p className="mt-1 text-xs text-white/70">Submit your track to the next open battle. Free to enter, audience votes determine the winner.</p>
            <button className="mt-4 w-full rounded-lg bg-red-600 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-red-500">Submit Track</button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div><span className="font-black text-white">{value}</span> <span className="text-white/50">{label}</span></div>
    </div>
  );
}
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
      {sub && <p className="mt-1 text-sm text-white/50">{sub}</p>}
    </div>
  );
}