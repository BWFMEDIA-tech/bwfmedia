import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Flame, Heart, Play, Sparkles, Star, TrendingUp, Trophy, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Charts — Tunevio" },
      { name: "description", content: "Ranked tracks on Tunevio." },
      { property: "og:title", content: "Charts — Tunevio" },
      { property: "og:description", content: "Ranked tracks on Tunevio." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground p-10">
      <p className="text-destructive">Couldn't load charts: {(error as Error).message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-foreground">Not found.</div>,
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
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <main className="swara-charts min-h-screen bg-background text-foreground pt-8 pb-24 md:pb-10">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-semibold">Charts</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked tracks on Tunevio.
          </p>
        </div>

        {/* Tabs */}
        <div className="swara-chart-tabs mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary p-1 sm:grid-cols-3 md:grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === tab;
            return (
              <Button
                variant="ghost"
                aria-pressed={isActive}
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow shadow-primary/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{t.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Section title */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold">{active.label}</h2>
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {rows.length} track{rows.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Table */}
        <div className="swara-chart-table overflow-hidden rounded-xl border border-border bg-background">
          <div className="hidden md:grid grid-cols-[48px_1fr_80px_120px_80px_80px] gap-4 border-b border-border bg-secondary/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <div>#</div>
            <div>Track</div>
            <div className="text-right">Time</div>
            <div className="text-right">Rating</div>
            <div className="text-right">Plays</div>
            <div className="text-right">Likes</div>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading charts…</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No tracks yet in this chart.</div>
          ) : (
            <ul className="divide-y divide-border/50">
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
    if (!track.audioUrl) return;
    const playable = queue.flatMap((q) => q.audioUrl ? [{ id: q.id, title: q.title, artist: q.artistName, audioUrl: q.audioUrl, coverUrl: q.coverUrl ?? undefined }] : []);
    player.play(
      {
        id: track.id,
        title: track.title,
        artist: track.artistName,
        audioUrl: track.audioUrl,
        coverUrl: track.coverUrl ?? undefined,
      },
      playable,
    );
  }

  const rank =
    index === 1 ? "text-primary" : index === 2 ? "text-brand-silver" : index === 3 ? "text-accent" : "text-muted-foreground";

  return (
    <li className="grid grid-cols-[36px_1fr_auto] md:grid-cols-[48px_1fr_80px_120px_80px_80px] items-center gap-3 md:gap-4 px-3 md:px-4 py-3 hover:bg-secondary/40">
      <div className={`text-sm font-black tabular-nums ${rank}`}>{index}</div>

      <Button
        variant="ghost"
        disabled={!canPlay}
        aria-label={`Play ${track.title}`}
        onClick={handlePlay}
        className="group flex h-auto min-w-0 justify-start gap-3 p-0 text-left hover:bg-transparent"
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary">
          {track.coverUrl ? (
            <SignedImg src={track.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <Music className="h-4 w-4" />
            </div>
          )}
          {canPlay && (
            <div className="absolute inset-0 grid place-items-center bg-background/50 opacity-0 transition group-hover:opacity-100">
              <Play className="h-4 w-4 text-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{track.title}</div>
          {track.artistUserId ? (
            <Link
              to="/artist/$id"
              params={{ id: track.artistUserId }}
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-xs text-muted-foreground hover:text-primary transition"
            >
              {track.artistName}
            </Link>
          ) : (
            <div className="truncate text-xs text-muted-foreground">{track.artistName}</div>
          )}
        </div>
      </Button>

      <div className="hidden md:block text-right text-xs tabular-nums text-muted-foreground">
        {track.durationSeconds ? fmtTime(track.durationSeconds) : "—"}
      </div>
      <div className="hidden md:flex items-center justify-end gap-1 text-xs tabular-nums">
        {track.ratingCount > 0 ? (
          <>
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-bold text-primary">{track.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({track.ratingCount})</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <div className="hidden md:block text-right text-xs tabular-nums text-muted-foreground">
        {track.playCount > 0 ? fmtCount(track.playCount) : "—"}
      </div>
      <div className="hidden md:block text-right text-xs tabular-nums text-muted-foreground">
        {track.likeCount > 0 ? fmtCount(track.likeCount) : "—"}
      </div>

      {/* Mobile compact stats */}
      <div className="md:hidden flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
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