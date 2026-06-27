import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Crown, Trophy, Medal, Search, Flame, Swords, ThumbsUp, Disc3, Sparkles, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SignedImg } from "@/components/ui/signed-img";
import { getArtistLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard.functions";

const leaderboardQuery = queryOptions({
  queryKey: ["artist-leaderboard"],
  queryFn: () => getArtistLeaderboard(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Artist Leaderboard — BWF Network" },
      { name: "description", content: "The top artists on BWF Network ranked by XP, battle wins, and audience votes. Climb the ranks." },
      { property: "og:title", content: "Artist Leaderboard — BWF Network" },
      { property: "og:description", content: "The top artists on BWF Network ranked by XP, battle wins, and audience votes." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(leaderboardQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#05050a] text-white p-10">
      <p className="text-red-400">Couldn't load leaderboard: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-white">Not found.</div>,
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data: rows = [] } = useQuery(leaderboardQuery);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(n) || (r.username?.toLowerCase().includes(n) ?? false),
    );
  }, [rows, q]);

  const top3 = rows.slice(0, 3);
  const rest = filtered.filter((r) => r.rank > 3);

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        <header className="space-y-4">
          <Link to="/artists" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All artists
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#C53DFF] via-[#FF00A6] to-[#00E6FF] p-2.5">
              <Trophy className="h-7 w-7 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Artist Leaderboard
              </h1>
              <p className="text-sm text-white/60 sm:text-base">
                Ranked by XP, battle wins, and audience votes.
              </p>
            </div>
          </div>
        </header>

        {/* Podium */}
        {top3.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-3">
            {[1, 0, 2].map((idx, i) => {
              const a = top3[idx];
              if (!a) return <div key={i} />;
              return <PodiumCard key={a.userId} entry={a} />;
            })}
          </section>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search artists…"
            className="bg-white/5 border-white/10 pl-10 text-white placeholder:text-white/40"
          />
        </div>

        {/* List */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="hidden md:grid grid-cols-[64px_1fr_120px_120px_120px_120px] gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-xs uppercase tracking-wider text-white/40">
            <div>Rank</div>
            <div>Artist</div>
            <div className="text-right">XP</div>
            <div className="text-right">Battle Wins</div>
            <div className="text-right">Votes</div>
            <div className="text-right">Tracks</div>
          </div>
          {rest.length === 0 && filtered.length === 0 && (
            <div className="p-10 text-center text-white/50">No artists match that search.</div>
          )}
          {(q ? filtered : rest).map((a) => (
            <LeaderRow key={a.userId} entry={a} />
          ))}
        </section>
      </div>
    </div>
  );
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const accent =
    entry.rank === 1
      ? "from-[#FFD700] via-[#FF00A6] to-[#C53DFF]"
      : entry.rank === 2
      ? "from-[#C0C0C0] via-[#00E6FF] to-[#004BFF]"
      : "from-[#CD7F32] via-[#FF00A6] to-[#C53DFF]";
  const Icon = entry.rank === 1 ? Crown : entry.rank === 2 ? Trophy : Medal;
  const height = entry.rank === 1 ? "sm:mt-0" : entry.rank === 2 ? "sm:mt-6" : "sm:mt-10";

  return (
    <Link
      to="/artist/$id"
      params={{ id: entry.publicId }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 transition hover:border-white/30 ${height}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-black font-black`}>
          {entry.rank}
        </span>
        <Icon className="h-6 w-6 text-white/80" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className={`rounded-full bg-gradient-to-br ${accent} p-[2px]`}>
          <div className="rounded-full bg-[#05050a] p-[2px]">
            {entry.avatarUrl ? (
              <SignedImg
                src={entry.avatarUrl}
                alt={entry.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-bold">
                {entry.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{entry.name}</div>
          {entry.username && (
            <div className="truncate text-xs text-white/50">@{entry.username}</div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat icon={Sparkles} label="XP" value={entry.xp} />
        <Stat icon={Swords} label="Wins" value={entry.battleWins} />
        <Stat icon={ThumbsUp} label="Votes" value={entry.totalVotes} />
      </div>
    </Link>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.04] py-2">
      <Icon className="mx-auto h-3.5 w-3.5 text-white/60" />
      <div className="mt-1 text-sm font-bold">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}

function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
  const rankColor =
    entry.rank <= 3
      ? "text-[#FF00A6]"
      : entry.rank <= 10
      ? "text-[#00E6FF]"
      : "text-white/60";
  return (
    <Link
      to="/artist/$id"
      params={{ id: entry.publicId }}
      className="grid grid-cols-[40px_1fr_auto] md:grid-cols-[64px_1fr_120px_120px_120px_120px] gap-4 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.04] sm:px-5"
    >
      <div className={`flex items-center text-lg font-black ${rankColor}`}>
        {entry.rank <= 10 && <Flame className="mr-1 h-4 w-4" />}#{entry.rank}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        {entry.avatarUrl ? (
          <SignedImg
            src={entry.avatarUrl}
            alt={entry.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold">
            {entry.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold">{entry.name}</div>
          {entry.username && (
            <div className="truncate text-xs text-white/40">@{entry.username}</div>
          )}
        </div>
      </div>
      <div className="hidden text-right font-mono tabular-nums md:block">
        {entry.xp.toLocaleString()}
      </div>
      <div className="hidden text-right font-mono tabular-nums md:block">
        {entry.battleWins}
      </div>
      <div className="hidden text-right font-mono tabular-nums md:block">
        {entry.totalVotes.toLocaleString()}
      </div>
      <div className="hidden items-center justify-end gap-1 md:flex">
        <Disc3 className="h-3.5 w-3.5 text-white/40" />
        <span className="font-mono tabular-nums">{entry.trackCount}</span>
      </div>
      <div className="md:hidden text-right font-mono text-sm tabular-nums">
        {entry.score.toLocaleString()}
      </div>
    </Link>
  );
}