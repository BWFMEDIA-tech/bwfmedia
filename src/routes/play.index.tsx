import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords, Radio, Calendar, Trophy, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { StreamThumbnailImage } from "@/components/stream/StreamThumbnailImage";
import { FreestyleQueue } from "@/components/play/FreestyleQueue";
import { PlayProfileHero } from "@/components/play/PlayProfileHero";
import { useLiveStageFeed } from "@/lib/use-live-stage-navigation";
import { stageDestination } from "@/lib/live-stage-navigation";

export const Route = createFileRoute("/play/")({
  head: () => ({ meta: [
    { title: "Play Arena — TUNEVIO" },
    { name: "description", content: "Confirmed Freestyle battles and active live performances on Tunevio." },
    { property: "og:title", content: "Play Arena — TUNEVIO" },
    { property: "og:description", content: "Discover confirmed artist matchups and join live performances on Tunevio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PlayArenaDashboard,
});

function PlayArenaDashboard() {
  const feed = useLiveStageFeed();
  const live = feed.online && !feed.isError ? feed.entries : [];
  return <main className="min-h-screen bg-background px-4 pb-24 pt-8 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
        <div><p className="mb-2 text-sm font-semibold text-primary">TUNEVIO</p><h1 className="text-3xl font-bold sm:text-4xl">Play Arena</h1></div>
        <Button asChild><Link to="/play/challenges"><Swords />Challenge an artist</Link></Button>
      </header>
      <FreestyleQueue overview />
      {feed.isError && <div role="alert" className="flex items-center gap-3 text-sm text-muted-foreground">Live performances are temporarily unavailable.<Button variant="link" onClick={feed.retry}>Retry</Button></div>}
      {live.length > 0 && <section aria-label="Active live performances" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Live performances</h2><Button asChild variant="link"><Link to="/live">View all<ArrowUpRight /></Link></Button></div>
        <div className="grid gap-6 sm:grid-cols-2">
          {live.slice(0, 4).map(entry => <Link key={`${entry.kind}:${entry.id}`} {...stageDestination({ ...entry, status: "live" })} className="group min-w-0">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              {entry.thumbnail_url ? <StreamThumbnailImage src={entry.thumbnail_url} alt={entry.title} className="absolute inset-0 h-full w-full object-cover" /> : <SignedImg src={entry.host?.avatar_url ?? undefined} alt={entry.title} className="h-full w-full object-cover" />}
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded bg-background/80 px-3 py-1.5 text-xs font-semibold text-primary"><Radio className="h-3.5 w-3.5" />Live</span>
            </div>
            <h3 className="mt-4 break-words text-lg font-bold group-hover:text-primary">{entry.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{entry.host?.stage_name || entry.host?.display_name || "Tunevio host"}</p>
          </Link>)}
        </div>
      </section>}
      <nav aria-label="More Arena pages" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5">
        <Button asChild variant="ghost"><Link to="/live"><Radio />Live</Link></Button>
        <Button asChild variant="ghost"><Link to="/events"><Calendar />Events</Link></Button>
        <Button asChild variant="ghost"><Link to="/play/ranks"><Trophy />Ranks</Link></Button>
      </nav>
    </div>
  </main>;
}
