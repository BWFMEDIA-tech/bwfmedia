import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Crown, Flame, Heart, Music, Play, RefreshCw, Sparkles, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { usePlayer } from "@/lib/player-context";
import { getCharts, type ChartTab, type ChartTrack } from "@/lib/charts.functions";
import logoAsset from "@/assets/tunevio-header-logo.png.asset.json";

const PREVIEW = 20;

const chartsQuery = (tab: ChartTab) =>
  queryOptions({
    queryKey: ["charts-v2", tab],
    queryFn: () => getCharts({ data: { tab, limit: 100 } }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

export const Route = createFileRoute("/charts")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Top 100 Songs — Tunevio Billboard" },
      { name: "description", content: "The hottest tracks on Tunevio, ranked by verified plays." },
      { property: "og:title", content: "Top 100 Songs — Tunevio Billboard" },
      { property: "og:description", content: "The hottest tracks on Tunevio, ranked by verified plays." },
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

const TABS: { id: ChartTab; label: string; icon: React.ComponentType<{ className?: string }>; metric: string }[] = [
  { id: "top_100", label: "Top 100", icon: Trophy, metric: "Ranked by verified total plays" },
  { id: "trending", label: "Trending", icon: Flame, metric: "Most verified plays in the last 7 days" },
  { id: "most_played", label: "Most Played", icon: Play, metric: "Highest cumulative verified plays" },
  { id: "most_liked", label: "Most Liked", icon: Heart, metric: "Most unique likes" },
  { id: "fresh_reviews", label: "Fresh Reviews", icon: Sparkles, metric: "Newest rated tracks" },
];

function ChartsPage() {
  const [tab, setTab] = useState<ChartTab>("top_100");
  const [full, setFull] = useState(false);
  const { data, isLoading, isFetching, refetch, isError } = useQuery(chartsQuery(tab));
  const rows: ChartTrack[] = Array.isArray(data) ? (data as ChartTrack[]) : (data?.tracks ?? []);
  const shown = full ? rows : rows.slice(0, PREVIEW);
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <main className="tbb-page min-h-screen overflow-x-hidden pb-24 pt-6 text-foreground md:pb-10">
      <div className="mx-auto w-full max-w-4xl px-3 md:px-6">
        <header className="flex flex-col items-center text-center">
          <img src={logoAsset.url} alt="Tunevio" className="h-14 w-auto object-contain md:h-20" />
          <h1 className="tbb-chrome mt-3 text-3xl font-black tracking-tight md:text-5xl">TOP 100 SONGS</h1>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-cyan md:text-xs">
            The hottest tracks on Tunevio
          </p>
        </header>

        <nav className="tbb-tabs mt-5 flex gap-1 overflow-x-auto rounded-2xl p-1" aria-label="Chart type">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => { setTab(t.id); setFull(false); }}
                className={`flex shrink-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm ${
                  on ? "tbb-tab-on text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
          <span className="truncate">{active.metric}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Refresh chart"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {data ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Refresh"}
          </button>
        </div>

        <section className="mt-3 space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="tbb-row h-[72px] animate-pulse rounded-2xl" />)
          ) : isError ? (
            <div className="tbb-row rounded-2xl p-8 text-center text-sm text-muted-foreground">
              Couldn't load this chart. <button className="text-brand-cyan underline" onClick={() => refetch()}>Try again</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="tbb-row rounded-2xl p-8 text-center text-sm text-muted-foreground">No eligible songs in this chart yet.</div>
          ) : (
            <ol className="space-y-2">
              {shown.map((t, i) => (
                <ChartRow key={t.id} track={t} rank={i + 1} queue={rows} tab={tab} />
              ))}
            </ol>
          )}
        </section>

        {!full && rows.length > PREVIEW && (
          <div className="mt-5 flex justify-center">
            <Button onClick={() => setFull(true)} className="tbb-cta rounded-full px-6 font-black tracking-wide">
              VIEW FULL BILLBOARD 100 <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function ChartRow({ track, rank, queue, tab }: { track: ChartTrack; rank: number; queue: ChartTrack[]; tab: ChartTab }) {
  const player = usePlayer();
  const canPlay = !!track.audioUrl;
  const top = rank === 1;

  function handlePlay() {
    if (!track.audioUrl) return;
    const playable = queue.flatMap((q) => (q.audioUrl ? [{ id: q.id, title: q.title, artist: q.artistName, audioUrl: q.audioUrl, coverUrl: q.coverUrl ?? undefined }] : []));
    player.play({ id: track.id, title: track.title, artist: track.artistName, audioUrl: track.audioUrl, coverUrl: track.coverUrl ?? undefined }, playable);
  }

  const stat =
    tab === "most_liked"
      ? { value: track.likeCount, label: "likes" }
      : tab === "trending"
        ? { value: track.recentPlays, label: "plays / 7d" }
        : { value: track.playCount, label: "plays" };

  return (
    <li className={`tbb-row relative flex items-center gap-3 rounded-2xl px-3 ${top ? "tbb-row-top py-4" : "py-2.5"}`}>
      <div className={`tbb-rank w-9 shrink-0 text-center font-black tabular-nums ${top ? "text-4xl" : "text-xl"}`}>
        {top && <Crown className="mx-auto -mb-1 h-4 w-4 text-brand-cyan" aria-hidden />}
        {rank}
      </div>
      <button
        type="button"
        disabled={!canPlay}
        onClick={handlePlay}
        aria-label={`Play ${track.title}`}
        className={`group relative aspect-square shrink-0 overflow-hidden rounded-xl bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${top ? "w-16 md:w-20" : "w-12 md:w-14"}`}
      >
        {track.coverUrl ? (
          <SignedImg src={track.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music className="m-auto h-4 w-4 text-muted-foreground" />
        )}
        {canPlay && (
          <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <Play className="h-4 w-4 fill-white text-white" />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`truncate font-bold ${top ? "text-base md:text-lg" : "text-sm"}`}>{track.title}</div>
        {track.artistUserId ? (
          <Link to="/artist/$id" params={{ id: track.artistUserId }} className="block truncate text-xs text-muted-foreground hover:text-brand-cyan">
            {track.artistName}
          </Link>
        ) : (
          <div className="truncate text-xs text-muted-foreground">{track.artistName}</div>
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className={`h-3 w-3 ${track.ratingCount > 0 ? "fill-brand-cyan text-brand-cyan" : ""}`} />
          {track.ratingCount > 0 ? track.rating.toFixed(1) : "—"}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`font-black tabular-nums text-white ${top ? "text-xl" : "text-base"}`}>{fmtCount(stat.value)}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">{stat.label}</div>
      </div>
    </li>
  );
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
