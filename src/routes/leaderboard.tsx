import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Trophy, Medal, Search, Flame, Swords, ThumbsUp, Disc3, Sparkles, ArrowLeft, TrendingUp, Zap } from "lucide-react";
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
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  // Realtime: refetch the leaderboard whenever votes, matches, or streams change.
  useEffect(() => {
    let pending = false;
    const invalidate = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        queryClient.invalidateQueries({ queryKey: ["artist-leaderboard"] });
      }, 400);
    };
    const channel = supabase
      .channel("arena-leaderboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_votes" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_matches" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_rounds" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(n) || (r.username?.toLowerCase().includes(n) ?? false),
    );
  }, [rows, q]);

  const top3 = rows.slice(0, 3);
  const rest = filtered.filter((r) => r.rank > 3);

  const totals = useMemo(() => {
    return rows.reduce(
      (a, r) => ({
        xp: a.xp + r.xp,
        votes: a.votes + r.totalVotes,
        wins: a.wins + r.battleWins,
      }),
      { xp: 0, votes: 0, wins: 0 },
    );
  }, [rows]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05050a] text-white">
      {/* Cinematic backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#C53DFF]/25 blur-[140px]" />
        <div className="absolute top-20 right-[-160px] h-[460px] w-[460px] rounded-full bg-[#FF00A6]/25 blur-[140px]" />
        <div className="absolute bottom-[-200px] left-1/3 h-[520px] w-[520px] rounded-full bg-[#00E6FF]/20 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 space-y-12">
        {/* HERO */}
        <header className="space-y-6">
          <Link
            to="/artists"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All artists
          </Link>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF00A6] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF00A6]" />
                </span>
                Live Rankings · Season 01
              </div>
              <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
                <span className="block bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                  THE
                </span>
                <span className="block bg-gradient-to-r from-[#C53DFF] via-[#FF00A6] to-[#00E6FF] bg-clip-text text-transparent">
                  LEADERBOARD
                </span>
              </h1>
              <p className="max-w-md text-sm text-white/60 sm:text-base">
                Every vote, every win, every stream — calculated live. Only the loudest survive.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 sm:w-auto">
              <HeroStat icon={Sparkles} label="XP" value={totals.xp} accent="#C53DFF" />
              <HeroStat icon={ThumbsUp} label="Votes" value={totals.votes} accent="#00E6FF" />
              <HeroStat icon={Swords} label="Wins" value={totals.wins} accent="#FF00A6" />
            </div>
          </div>
        </header>

        {/* PODIUM */}
        {top3.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-3 sm:items-end">
            {[1, 0, 2].map((idx, i) => {
              const a = top3[idx];
              if (!a) return <div key={i} />;
              return <PodiumCard key={a.userId} entry={a} />;
            })}
          </section>
        )}

        {/* SEARCH + COUNT */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the ranks…"
              className="h-12 rounded-full border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/40 focus-visible:ring-[#FF00A6]/50"
            />
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50">
            <TrendingUp className="h-3.5 w-3.5 text-[#00E6FF]" />
            {rows.length} artists ranked
          </div>
        </div>

        {/* LIST */}
        <section className="space-y-2">
          {rest.length === 0 && filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/50">
              No artists match that search.
            </div>
          )}
          {(q ? filtered : rest).map((a) => (
            <LeaderRow key={a.userId} entry={a} />
          ))}
        </section>
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 backdrop-blur"
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-white/50">
        <Icon className="h-3 w-3" style={{ color: accent }} />
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums sm:text-xl">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString()}
      </div>
    </div>
  );
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const isFirst = entry.rank === 1;
  const accent =
    entry.rank === 1
      ? { from: "#FFD700", via: "#FF00A6", to: "#C53DFF", glow: "rgba(255,0,166,0.55)" }
      : entry.rank === 2
      ? { from: "#E5E7EB", via: "#00E6FF", to: "#004BFF", glow: "rgba(0,230,255,0.45)" }
      : { from: "#CD7F32", via: "#C53DFF", to: "#FF00A6", glow: "rgba(197,61,255,0.45)" };
  const Icon = entry.rank === 1 ? Crown : entry.rank === 2 ? Trophy : Medal;
  const lift =
    entry.rank === 1 ? "sm:-translate-y-6 sm:scale-[1.04]" : entry.rank === 2 ? "" : "sm:translate-y-3";

  return (
    <Link
      to="/artist/$id"
      params={{ id: entry.publicId }}
      className={`group relative block transition-transform duration-500 hover:-translate-y-1 ${lift}`}
    >
      {/* Glow halo */}
      <div
        className="absolute -inset-px rounded-3xl opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${accent.from}, ${accent.via}, ${accent.to})`,
        }}
      />
      {/* Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0d0d18] to-[#05050a] p-5 sm:p-6">
        {/* Top accent bar */}
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, ${accent.from}, ${accent.via}, ${accent.to})`,
          }}
        />
        {/* Rank watermark */}
        <div
          className="pointer-events-none absolute -right-4 -bottom-10 select-none text-[160px] font-black leading-none tracking-tighter opacity-[0.08]"
          style={{ color: accent.via }}
        >
          {entry.rank}
        </div>

        <div className="relative flex items-start justify-between">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-base font-black text-black"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.via})`,
              boxShadow: `0 0 24px ${accent.glow}`,
            }}
          >
            #{entry.rank}
          </span>
          <Icon
            className="h-7 w-7"
            style={{ color: accent.from, filter: `drop-shadow(0 0 8px ${accent.glow})` }}
          />
        </div>

        {/* Avatar */}
        <div className="relative mt-5 flex items-center gap-4">
          <div className="relative">
            <div
              className="absolute -inset-1 rounded-full opacity-80 blur-md"
              style={{
                background: `linear-gradient(135deg, ${accent.from}, ${accent.via}, ${accent.to})`,
              }}
            />
            <div
              className="relative rounded-full p-[2px]"
              style={{
                background: `linear-gradient(135deg, ${accent.from}, ${accent.via}, ${accent.to})`,
              }}
            >
              <div className="rounded-full bg-[#05050a] p-[3px]">
                {entry.avatarUrl ? (
                  <SignedImg
                    src={entry.avatarUrl}
                    alt={entry.name}
                    className={`rounded-full object-cover ${isFirst ? "h-20 w-20" : "h-16 w-16"}`}
                  />
                ) : (
                  <div
                    className={`flex items-center justify-center rounded-full bg-white/10 font-bold ${
                      isFirst ? "h-20 w-20 text-2xl" : "h-16 w-16 text-xl"
                    }`}
                  >
                    {entry.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className={`truncate font-black ${isFirst ? "text-2xl" : "text-xl"}`}>
              {entry.name}
            </div>
            {entry.username && (
              <div className="truncate text-xs text-white/40">@{entry.username}</div>
            )}
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <Zap className="h-2.5 w-2.5" style={{ color: accent.via }} />
              {entry.score.toLocaleString()} pts
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
          <PodiumStat icon={Sparkles} label="XP" value={entry.xp} accent={accent.via} />
          <PodiumStat icon={Swords} label="Wins" value={entry.battleWins} accent={accent.via} />
          <PodiumStat icon={ThumbsUp} label="Votes" value={entry.totalVotes} accent={accent.via} />
        </div>
      </div>
    </Link>
  );
}

function PodiumStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 py-2.5">
      <Icon className="mx-auto h-3.5 w-3.5" style={{ color: accent }} />
      <div className="mt-1 font-mono text-sm font-bold tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-white/40">{label}</div>
    </div>
  );
}

function LeaderRow({ entry }: { entry: LeaderboardEntry }) {
  const isHot = entry.rank <= 10;
  const rankAccent =
    entry.rank <= 10 ? "#FF00A6" : entry.rank <= 25 ? "#00E6FF" : "rgba(255,255,255,0.4)";

  return (
    <Link
      to="/artist/$id"
      params={{ id: entry.publicId }}
      className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
    >
      {/* Left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-[3px] transition-all duration-300 group-hover:w-1"
        style={{ background: rankAccent }}
      />
      {/* Hover sweep */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />

      <div className="relative grid grid-cols-[48px_1fr_auto] md:grid-cols-[80px_1fr_100px_100px_100px_90px] items-center gap-3 px-4 py-3.5 sm:px-5 md:gap-4">
        <div className="flex items-center gap-1.5">
          {isHot && (
            <Flame
              className="h-3.5 w-3.5"
              style={{ color: rankAccent, filter: `drop-shadow(0 0 6px ${rankAccent})` }}
            />
          )}
          <span className="font-mono text-base font-black tabular-nums" style={{ color: rankAccent }}>
            {String(entry.rank).padStart(2, "0")}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            {isHot && (
              <div
                className="absolute -inset-0.5 rounded-full opacity-60 blur-sm"
                style={{ background: rankAccent }}
              />
            )}
            {entry.avatarUrl ? (
              <SignedImg
                src={entry.avatarUrl}
                alt={entry.name}
                className="relative h-11 w-11 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-bold ring-1 ring-white/10">
                {entry.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">{entry.name}</div>
            {entry.username && (
              <div className="truncate text-xs text-white/40">@{entry.username}</div>
            )}
          </div>
        </div>

        <RowCell icon={Sparkles} value={entry.xp} color="#C53DFF" />
        <RowCell icon={Swords} value={entry.battleWins} color="#FF00A6" />
        <RowCell icon={ThumbsUp} value={entry.totalVotes} color="#00E6FF" />
        <RowCell icon={Disc3} value={entry.trackCount} color="rgba(255,255,255,0.5)" />

        <div className="md:hidden text-right">
          <div className="font-mono text-sm font-bold tabular-nums" style={{ color: rankAccent }}>
            {entry.score.toLocaleString()}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">pts</div>
        </div>
      </div>
    </Link>
  );
}

function RowCell({ icon: Icon, value, color }: { icon: any; value: number; color: string }) {
  return (
    <div className="hidden md:flex items-center justify-end gap-1.5">
      <Icon className="h-3 w-3" style={{ color }} />
      <span className="font-mono text-sm tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}