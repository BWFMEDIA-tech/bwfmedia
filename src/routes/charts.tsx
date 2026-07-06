import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Flame, Heart, Play, Sparkles, Star, TrendingUp, Trophy, Music } from "lucide-react";
import { SignedImg } from "@/components/ui/signed-img";
import { usePlayer } from "@/lib/player-context";
import { getCharts, type ChartTab, type ChartTrack } from "@/lib/charts.functions";

const chartsQuery = (tab: ChartTab) =>
  queryOptions({
    queryKey: ["charts", tab],
    queryFn: () => getCharts({ data: { tab, limit: 50 } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/charts")({
  head: () => ({
    meta: [
      { title: "Charts — Tune Tavern" },
      { name: "description", content: "The top tracks on Tune Tavern, updated in real time." },
      { property: "og:title", content: "Charts — Tune Tavern" },
      { property: "og:description", content: "The top tracks on Tune Tavern, updated in real time." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-black text-white p-10">
      <p className="text-red-400">Couldn't load charts: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-white">Not found.</div>,
  component: ChartsPage,
});

const TABS: { id: ChartTab; label: string; icon: React.ComponentType<{ className?: string }>; }[] = [
  { id: "top_rated", label: "Top Rated", icon: Trophy },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "most_played", label: "Most Played", icon: Play },
  { id: "most_liked", label: "Most Liked", icon: Heart },
  { id: "fresh_reviews", label: "Fresh Reviews", icon: Sparkles },
];

function ChartsPage() {
  const [tab, setTab] = useState<ChartTab>("top_rated");
  const { data: rows = [], isLoading } = useQuery(chartsQuery(tab));
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <main className="min-h-screen bg-black text-white pt-20 pb-24 md:pb-10">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Charts</h1>
          </div>
          <p className="mt-1 text-sm text-white/60">
            The top tracks on Tune Tavern, updated in real time.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:grid-cols-3 md:grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary text-black shadow shadow-primary/30"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section title */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold">{active.label}</h2>
          </div>
          <div className="text-xs uppercase tracking-widest text-white/40">
            {rows.length} track{rows.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="hidden md:grid grid-cols-[48px_1fr_80px_120px_80px_80px] gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <div>#</div>
            <div>Track</div>
            <div className="text-right">Time</div>
            <div className="text-right">Rating</div>
            <div className="text-right">Plays</div>
            <div className="text-right">Likes</div>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-sm text-white/50">Loading charts…</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-white/50">No tracks yet in this chart.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {rows.map((t, i) => (
                <ChartRow key={t.id} track={t} index={i + 1} queue={rows} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function ChartRow({ track, index, queue }: { track: ChartTrack; index: number; queue: ChartTrack[] }) {
  const player = usePlayer();
  const canPlay = !!track.audioUrl;

  function handlePlay() {
    if (!canPlay) return;
    const playable = queue.filter((q) => q.audioUrl);
    player.play(
      {
        id: track.id,
        title: track.title,
        artist: track.artistName,
        audioUrl: track.audioUrl!,
        coverUrl: track.coverUrl ?? undefined,
      },
      playable.map((q) => ({
        id: q.id,
        title: q.title,
        artist: q.artistName,
        audioUrl: q.audioUrl!,
        coverUrl: q.coverUrl ?? undefined,
      })),
    );
  }

  const rank =
    index === 1 ? "text-primary" : index === 2 ? "text-white/80" : index === 3 ? "text-accent" : "text-white/40";

  return (
    <li className="grid grid-cols-[36px_1fr_auto] md:grid-cols-[48px_1fr_80px_120px_80px_80px] items-center gap-3 md:gap-4 px-3 md:px-4 py-3 hover:bg-white/[0.03]">
      <div className={`text-sm font-black tabular-nums ${rank}`}>{index}</div>

      <button
        onClick={handlePlay}
        className="flex min-w-0 items-center gap-3 text-left group"
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-white/5">
          {track.coverUrl ? (
            <SignedImg src={track.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-white/30">
              <Music className="h-4 w-4" />
            </div>
          )}
          {canPlay && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              <Play className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{track.title}</div>
          <div className="truncate text-xs text-white/50">{track.artistName}</div>
        </div>
      </button>

      <div className="hidden md:block text-right text-xs tabular-nums text-white/50">
        {track.durationSeconds ? fmtTime(track.durationSeconds) : "—"}
      </div>
      <div className="hidden md:flex items-center justify-end gap-1 text-xs tabular-nums">
        {track.ratingCount > 0 ? (
          <>
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-bold text-primary">{track.rating.toFixed(1)}</span>
            <span className="text-white/40">({track.ratingCount})</span>
          </>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </div>
      <div className="hidden md:block text-right text-xs tabular-nums text-white/60">
        {track.playCount > 0 ? fmtCount(track.playCount) : "—"}
      </div>
      <div className="hidden md:block text-right text-xs tabular-nums text-white/60">
        {track.likeCount > 0 ? fmtCount(track.likeCount) : "—"}
      </div>

      {/* Mobile compact stats */}
      <div className="md:hidden flex items-center gap-3 text-[11px] tabular-nums text-white/50">
        {track.ratingCount > 0 && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Star className="h-3 w-3 fill-primary" />
            {track.rating.toFixed(1)}
          </span>
        )}
        {track.playCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Play className="h-3 w-3" />
            {fmtCount(track.playCount)}
          </span>
        )}
        {track.likeCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {fmtCount(track.likeCount)}
          </span>
        )}
      </div>
    </li>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}