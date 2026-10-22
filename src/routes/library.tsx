import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, ListMusic, Music2, Play } from "lucide-react";
import { getHomeFeed } from "@/lib/home-feed.functions";
import { getMyTrackLikes } from "@/lib/track-likes.functions";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
import { TrackCard, toPlayerTrack } from "@/components/tunevio/cards";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [
    { title: "Music Library — Tunevio" },
    { name: "description", content: "Your saved catalog music and current Tunevio playback queue." },
    { property: "og:title", content: "Music Library — Tunevio" },
    { property: "og:description", content: "Listen to saved Tunevio catalog tracks and your current queue." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LibraryPage,
});

function LibraryPage() {
  const auth = useAuth();
  const player = usePlayer();
  const [mode, setMode] = useState<"saved" | "queue">("saved");
  const feed = useQuery({ queryKey: ["home-feed"], queryFn: () => getHomeFeed(), staleTime: 60_000 });
  const all = [...(feed.data?.newReleases ?? []), ...(feed.data?.popular ?? []), ...(feed.data?.charts ?? []), ...(feed.data?.discover ?? [])];
  const tracks = all.filter((t, i) => all.findIndex(a => a.id === t.id) === i);
  const ids = tracks.map(t => t.id);
  const likes = useQuery({ queryKey: ["my-track-likes", ids], queryFn: () => getMyTrackLikes({ data: { trackIds: ids } }), enabled: !!auth.user && ids.length > 0 });
  const saved = tracks.filter(t => likes.data?.liked.includes(t.id));
  const playable = saved.filter(t => t.audioUrl).map(toPlayerTrack);
  return <main className="swara-library mx-auto min-h-screen max-w-5xl px-4 pb-32 pt-8 sm:px-8">
    <h1 className="mb-6 text-3xl font-semibold">Library</h1>
    <div className="mb-8 flex gap-2" aria-label="Library views">
      <Button variant={mode === "saved" ? "default" : "secondary"} aria-pressed={mode === "saved"} onClick={() => setMode("saved")} className="rounded-full"><Heart className="h-4 w-4" />Saved music</Button>
      <Button variant={mode === "queue" ? "default" : "secondary"} aria-pressed={mode === "queue"} onClick={() => setMode("queue")} className="rounded-full"><ListMusic className="h-4 w-4" />Queue</Button>
    </div>
    {mode === "saved" ? <>
      <div className="mb-5 flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-lg bg-secondary"><Heart className="h-7 w-7 text-primary" /></span><div className="flex-1"><h2 className="text-lg font-semibold">Liked music</h2><p className="mt-1 text-sm text-muted-foreground">{saved.length} saved in the current catalog</p></div><Button size="icon" variant="secondary" aria-label="Play saved music" className="rounded-full" disabled={!playable.length} onClick={() => { const first = playable[0]; if (first) player.play(first, playable); }}><Play fill="currentColor" /></Button></div>
      {!auth.user ? <Button asChild variant="outline"><Link to="/login">Sign in to view saved music</Link></Button> : feed.isPending || likes.isFetching ? <p className="py-8 text-sm text-muted-foreground">Loading saved music…</p> : feed.isError || likes.isError ? <p className="py-8 text-sm text-destructive">Couldn’t load saved music.</p> : saved.length ? <div className="space-y-2">{saved.map(track => <TrackCard key={track.id} track={track} queue={saved} />)}</div> : <div className="py-12 text-center"><Music2 className="mx-auto mb-4 h-9 w-9 text-muted-foreground" /><p className="text-muted-foreground">No saved music in the current catalog.</p><Button variant="link" asChild><Link to="/">Browse music</Link></Button></div>}
    </> : <section><h2 className="mb-5 text-lg font-semibold">Up next · {player.queue.length}</h2>{player.queue.length ? <div className="divide-y divide-border">{player.queue.map((track, i) => <Button key={`${track.id}:${i}`} variant="ghost" className="h-auto w-full justify-start gap-4 rounded-none py-4 text-left" onClick={() => player.play(track, player.queue)}><span className="w-6 text-muted-foreground">{i + 1}</span><span className="min-w-0"><span className={`block truncate ${player.track?.id === track.id ? "text-primary" : "text-foreground"}`}>{track.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{track.artist}</span></span></Button>)}</div> : <p className="py-8 text-muted-foreground">Your playback queue is empty.</p>}</section>}
  </main>;
}