import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Flame, Trophy, Play, Calendar, Users, Sparkles, ChevronRight } from "lucide-react";
import { getPlayArenaLive } from "@/lib/play-arena-live.functions";
import { getArtistLeaderboard } from "@/lib/leaderboard.functions";
import { listPublicEvents } from "@/lib/events.functions";

export const Route = createFileRoute("/mic-drop")({
  component: MicDropArena,
  head: () => ({
    meta: [
      { title: "Mic Drop Arena — Live Battles | BWF Network" },
      {
        name: "description",
        content:
          "Live open mic battles, real-time audience voting and champion rankings, synced with the Play Arena on BWF Network.",
      },
      { property: "og:title", content: "Mic Drop Arena — Live Battles" },
      {
        property: "og:description",
        content: "Watch live battles, real-time votes and the current champions on BWF Network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SIDES = [
  { color: "from-red-600 to-pink-600" },
  { color: "from-purple-600 to-indigo-600" },
] as const;

function MicDropArena() {
  const liveFn = useServerFn(getPlayArenaLive);
  const boardFn = useServerFn(getArtistLeaderboard);
  const eventsFn = useServerFn(listPublicEvents);

  const { data: live } = useQuery({
    queryKey: ["mic-drop", "arena-live"],
    queryFn: () => liveFn({} as never),
    refetchInterval: 5000,
  });
  const { data: board } = useQuery({
    queryKey: ["mic-drop", "leaderboard"],
    queryFn: () => boardFn({} as never),
    refetchInterval: 60000,
  });
  const { data: events } = useQuery({
    queryKey: ["mic-drop", "events"],
    queryFn: () => eventsFn({} as never),
    refetchInterval: 60000,
  });

  const featured = live?.featured ?? null;
  const isLive = !!featured;
  const battlers = featured
    ? [
        { name: featured.artistA, sub: `Round wins: ${featured.aWins}`, votes: featured.aVotes },
        { name: featured.artistB, sub: `Round wins: ${featured.bWins}`, votes: featured.bVotes },
      ]
    : [];
  const totalVotes = battlers.reduce((s, b) => s + b.votes, 0);
  const pct = (i: number) =>
    totalVotes > 0 ? Math.round((battlers[i].votes / totalVotes) * 100) : 0;

  const leaders = (board ?? []).slice(0, 5);
  const upcoming = (events ?? [])
    .filter((e) => e.status === "scheduled" && new Date(e.starts_at).getTime() > Date.now() - 3600_000)
    .slice(0, 5);

  const battlesThisWeek = live?.activeBattles ?? 0;
  const room = featured?.roomName ?? null;
  const WatchLink = ({ className, children }: { className: string; children: React.ReactNode }) =>
    room ? (
      <Link to="/play/$room" params={{ room }} className={className}>
        {children}
      </Link>
    ) : (
      <Link to="/play" className={className}>
        {children}
      </Link>
    );

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(229,9,20,0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(120,40,200,0.2),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
              isLive
                ? "border-red-600/40 bg-red-600/10 text-red-400"
                : "border-white/15 bg-white/5 text-white/50"
            }`}
          >
            <Flame className="h-3 w-3" /> {isLive ? "Live Now" : "Offline"}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
            MIC DROP{" "}
            <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
              ARENA
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            Open mic battles. Talent showdowns. Audience votes decide who advances. Drop your mic,
            claim your crown.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/play"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-red-500"
            >
              <Mic className="h-4 w-4" /> Enter Battle
            </Link>
            <Link
              to={watchLink}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white/10"
            >
              <Play className="h-4 w-4" /> {isLive ? "Watch Live" : "Open Arena"}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-xs text-white/50">
            <Stat
              icon={<Users className="h-4 w-4 text-red-500" />}
              value={(live?.viewers ?? 0).toLocaleString()}
              label="Watching now"
            />
            <Stat
              icon={<Trophy className="h-4 w-4 text-red-500" />}
              value={featured ? `Round ${featured.currentRound}/${featured.totalRounds}` : "—"}
              label="Current round"
            />
            <Stat
              icon={<Sparkles className="h-4 w-4 text-red-500" />}
              value={String(battlesThisWeek)}
              label="Live battles"
            />
          </div>
        </div>
      </section>

      {/* Current Battle */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <SectionHeader
          title={isLive ? "Live Battle" : "Tonight's Battle"}
          sub={
            isLive
              ? "Live vote totals from the Play Arena, updating in real time."
              : "No battle is running right now. Open the arena to start or join one."
          }
        />
        {isLive ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {battlers.map((b, i) => (
              <WatchLink
                key={`${b.name}-${i}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left transition hover:border-white/20"
              >
                <div
                  className={`absolute -inset-0.5 -z-10 bg-gradient-to-br ${SIDES[i].color} opacity-20 blur-2xl transition group-hover:opacity-40`}
                />
                <div className="flex items-center gap-4">
                  <div
                    className={`grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br ${SIDES[i].color} text-xl font-black`}
                  >
                    {b.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-black">{b.name}</div>
                    <div className="truncate text-xs text-white/60">{b.sub}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black">{pct(i)}%</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40">
                      {b.votes.toLocaleString()} votes
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${SIDES[i].color} transition-all duration-500`}
                    style={{ width: `${pct(i)}%` }}
                  />
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
                  <Play className="h-3 w-3" /> Watch & Vote
                </div>
              </WatchLink>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
            No live battle at the moment. Check back soon or head to the arena.
          </div>
        )}
      </section>

      {/* Upcoming + Leaderboard */}
      <section className="mx-auto max-w-7xl px-6 pb-16 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <SectionHeader title="Upcoming Battles" />
          <div className="mt-4 space-y-2">
            {upcoming.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
                No battles scheduled yet.
              </div>
            )}
            {upcoming.map((u) => {
              const d = new Date(u.starts_at);
              const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
              const day = String(d.getDate()).padStart(2, "0");
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04]"
                >
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-red-500">
                      {month}
                    </div>
                    <div className="text-lg font-black leading-none">{day}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{u.title}</div>
                    <div className="text-xs text-white/50 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{" "}
                      {d.toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {u.location ? ` • ${u.location}` : ""}
                    </div>
                  </div>
                  <Link
                    to="/play"
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                  >
                    Register <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <aside>
          <SectionHeader title="Top Mics" sub="Ranked by real battle wins and votes." />
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {leaders.length === 0 && (
              <div className="p-6 text-sm text-white/50">No ranked artists yet.</div>
            )}
            {leaders.map((l) => (
              <Link
                key={l.userId}
                to="/artist/$id"
                params={{ id: l.userId }}
                className="flex items-center gap-3 p-3 hover:bg-white/[0.04]"
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-black ${
                    l.rank === 1
                      ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-black"
                      : l.rank === 2
                        ? "bg-zinc-400 text-black"
                        : l.rank === 3
                          ? "bg-amber-700 text-black"
                          : "bg-white/5 text-white/60"
                  }`}
                >
                  {l.rank}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{l.name}</div>
                  <div className="text-[11px] text-white/50">
                    {l.battleWins} wins • {l.currentStreak} win streak • {l.totalVotes} votes
                  </div>
                </div>
                {l.rank === 1 && <Trophy className="h-4 w-4 text-yellow-400" />}
              </Link>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-red-600/40 bg-gradient-to-br from-red-600/20 to-pink-600/10 p-5">
            <Mic className="h-6 w-6 text-red-500" />
            <div className="mt-3 text-lg font-black">Drop Your Mic</div>
            <p className="mt-1 text-xs text-white/70">
              Submit your track to the next open battle. Audience votes determine the winner.
            </p>
            <Link
              to="/play"
              className="mt-4 block w-full rounded-lg bg-red-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider hover:bg-red-500"
            >
              Submit Track
            </Link>
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
      <div>
        <span className="font-black text-white">{value}</span>{" "}
        <span className="text-white/50">{label}</span>
      </div>
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
