import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Film, Heart, ListMusic, Music2, Play, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getSavedVideos } from "@/lib/video-engagement.functions";
import { getHomeFeed } from "@/lib/home-feed.functions";
import { getMyTrackLikes } from "@/lib/track-likes.functions";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
import { TrackCard, toPlayerTrack } from "@/components/tunevio/cards";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [
    { title: "Music Library — Tunevio" },
    { name: "description", content: "Your saved music, followed artists, recently played tracks, saved videos and queue on Tunevio." },
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
  const [mode, setMode] = useState<Mode>("saved");
  const uid = auth.user?.id;
  const fetchSavedVideos = useServerFn(getSavedVideos);
  const follows = useQuery({ queryKey: ["library-follows", uid], enabled: !!uid && mode === "artists", queryFn: async () => {
    const { data, error } = await supabase.from("artist_follows").select("artist_id, created_at").eq("follower_id", uid!).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const ids = (data ?? []).map(r => r.artist_id);
    if (!ids.length) return [];
    const { data: profs, error: pe } = await supabase.from("profiles").select("id, display_name, stage_name, avatar_url, genre").in("id", ids);
    if (pe) throw pe;
    return ids.map(id => profs?.find(p => p.id === id)).filter(Boolean) as NonNullable<typeof profs>;
  } });
  const recent = useQuery({ queryKey: ["library-recent", uid], enabled: !!uid && mode === "recent", queryFn: async () => {
    const { data, error } = await supabase.from("stream_events").select("track_id, created_at").eq("user_id", uid!).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return [...new Set((data ?? []).map(r => r.track_id).filter(Boolean))] as string[];
  } });
  const videos = useQuery({ queryKey: ["library-videos", uid], enabled: !!uid && mode === "videos", queryFn: () => fetchSavedVideos() });
  const feed = useQuery({ queryKey: ["home-feed"], queryFn: () => getHomeFeed(), staleTime: 60_000 });
  const all = [...(feed.data?.newReleases ?? []), ...(feed.data?.popular ?? []), ...(feed.data?.charts ?? []), ...(feed.data?.discover ?? [])];
  const tracks = all.filter((t, i) => all.findIndex(a => a.id === t.id) === i);
  const ids = tracks.map(t => t.id);
  const likes = useQuery({ queryKey: ["my-track-likes", ids], queryFn: () => getMyTrackLikes({ data: { trackIds: ids } }), enabled: !!auth.user && ids.length > 0 });
  const allLikes = useQuery({ queryKey: ["library-all-likes", uid], enabled: !!uid, queryFn: async () => {
    const { data, error } = await supabase.from("track_likes").select("track_id, created_at").eq("user_id", uid!).order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return (data ?? []).map(r => r.track_id);
  } });
  const saved = tracks.filter(t => likes.data?.liked.includes(t.id) || allLikes.data?.includes(t.id));
  const unavailableSaved = (allLikes.data ?? []).filter(id => !tracks.some(t => t.id === id));
  const unavailableRecent = (recent.data ?? []).filter(id => !tracks.some(t => t.id === id));
  const recentTracks = (recent.data ?? []).map(id => tracks.find(t => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const playable = saved.filter(t => t.audioUrl).map(toPlayerTrack);
  return <main className="swara-library mx-auto min-h-screen max-w-5xl px-4 pb-32 pt-8 sm:px-8">
    <h1 className="mb-6 text-3xl font-semibold">Library</h1>
    <div className="mb-8 flex flex-wrap gap-2" aria-label="Library views">
      {MODES.map(m => <Button key={m.id} variant={mode === m.id ? "default" : "secondary"} aria-pressed={mode === m.id} onClick={() => setMode(m.id)} className="rounded-full"><m.icon className="h-4 w-4" />{m.label}</Button>)}
    </div>
    {!auth.user && mode !== "queue" ? <Button asChild variant="outline"><Link to="/login">Sign in to view your library</Link></Button> : mode === "artists" ? <section><h2 className="mb-5 text-lg font-semibold">Followed artists</h2>{follows.isPending ? <p className="py-8 text-sm text-muted-foreground">Loading artists…</p> : follows.isError ? <Retry onRetry={() => void follows.refetch()} /> : follows.data.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{follows.data.map(a => <Link key={a.id} to="/artist/$id" params={{ id: a.id }} className="group rounded-xl border border-border bg-card p-4 text-center hover:border-primary">{a.avatar_url ? <img src={a.avatar_url} alt="" className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-primary/50" /> : <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary"><Users className="h-7 w-7 text-muted-foreground" /></span>}<span className="mt-3 block truncate font-semibold group-hover:text-primary">{a.stage_name || a.display_name || "Tunevio artist"}</span>{a.genre && <span className="block truncate text-xs text-muted-foreground">{a.genre}</span>}</Link>)}</div> : <Empty text="You’re not following any artists yet." to="/artists" cta="Find artists" />}</section>
    : mode === "recent" ? <section><h2 className="mb-5 text-lg font-semibold">Recently played</h2>{recent.isPending || feed.isPending ? <p className="py-8 text-sm text-muted-foreground">Loading recent plays…</p> : recent.isError ? <Retry onRetry={() => void recent.refetch()} /> : recentTracks.length || unavailableRecent.length ? <div className="space-y-2">{recentTracks.map(track => <TrackCard key={track.id} track={track} queue={recentTracks} />)}<Unavailable count={unavailableRecent.length} /></div> : <Empty text="No recent plays yet." to="/discover" cta="Discover music" />}</section>
    : mode === "videos" ? <section><h2 className="mb-5 text-lg font-semibold">Saved videos</h2>{videos.isPending ? <p className="py-8 text-sm text-muted-foreground">Loading videos…</p> : videos.isError ? <Retry onRetry={() => void videos.refetch()} /> : videos.data.length ? <div className="divide-y divide-border">{videos.data.map(v => { const vid = (v as { videos?: { id: string; title: string; artist: string | null } | null }).videos; return vid ? <Link key={v.video_id} to="/videos/$id" params={{ id: vid.id }} className="flex items-center gap-4 py-4 hover:text-primary"><Film className="h-5 w-5 text-primary" /><span className="min-w-0"><span className="block truncate">{vid.title}</span><span className="block truncate text-xs text-muted-foreground">{vid.artist ?? "Tunevio artist"}</span></span></Link> : null; })}</div> : <Empty text="No saved videos yet." to="/videos" cta="Browse videos" />}</section>
    : null}
    {mode === "saved" && auth.user ? <>
      <div className="mb-5 flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-lg bg-secondary"><Heart className="h-7 w-7 text-primary" /></span><div className="flex-1"><h2 className="text-lg font-semibold">Liked music</h2><p className="mt-1 text-sm text-muted-foreground">{saved.length + unavailableSaved.length} saved{unavailableSaved.length ? ` · ${unavailableSaved.length} unavailable` : ""}</p></div><Button size="icon" variant="secondary" aria-label="Play saved music" className="rounded-full" disabled={!playable.length} onClick={() => { const first = playable[0]; if (first) player.play(first, playable); }}><Play fill="currentColor" /></Button></div>
      {feed.isPending || allLikes.isPending ? <p className="py-8 text-sm text-muted-foreground">Loading saved music…</p> : feed.isError || allLikes.isError ? <Retry onRetry={() => { void feed.refetch(); void allLikes.refetch(); }} /> : saved.length || unavailableSaved.length ? <div className="space-y-2">{saved.map(track => <TrackCard key={track.id} track={track} queue={saved} />)}<Unavailable count={unavailableSaved.length} /></div> : <div className="py-12 text-center"><Music2 className="mx-auto mb-4 h-9 w-9 text-muted-foreground" /><p className="text-muted-foreground">No saved music yet.</p><Button variant="link" asChild><Link to="/">Browse music</Link></Button></div>}
    </> : mode === "queue" ? <section><h2 className="mb-5 text-lg font-semibold">Up next · {player.queue.length}</h2>{player.queue.length ? <div className="divide-y divide-border">{player.queue.map((track, i) => <Button key={`${track.id}:${i}`} variant="ghost" className="h-auto w-full justify-start gap-4 rounded-none py-4 text-left" onClick={() => player.play(track, player.queue)}><span className="w-6 text-muted-foreground">{i + 1}</span><span className="min-w-0"><span className={`block truncate ${player.track?.id === track.id ? "text-primary" : "text-foreground"}`}>{track.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{track.artist}</span></span></Button>)}</div> : <p className="py-8 text-muted-foreground">Your playback queue is empty.</p>}</section> : null}
  </main>;
}

type Mode = "saved" | "artists" | "recent" | "videos" | "queue";
const MODES: { id: Mode; label: string; icon: typeof Heart }[] = [
  { id: "saved", label: "Saved music", icon: Heart },
  { id: "artists", label: "Artists", icon: Users },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "videos", label: "Videos", icon: Film },
  { id: "queue", label: "Queue", icon: ListMusic },
];

function Empty({ text, to, cta }: { text: string; to: "/artists" | "/discover" | "/videos"; cta: string }) {
  return <div className="py-12 text-center"><Music2 className="mx-auto mb-4 h-9 w-9 text-muted-foreground" /><p className="text-muted-foreground">{text}</p><Button variant="link" asChild><Link to={to}>{cta}</Link></Button></div>;
}

function Retry({ onRetry }: { onRetry: () => void }) {
  return <div className="py-8 text-sm text-destructive" role="alert">Couldn’t load this section. <Button variant="link" className="px-1" onClick={onRetry}>Retry</Button></div>;
}

function Unavailable({ count }: { count: number }) {
  if (!count) return null;
  return <div className="flex items-center gap-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"><Music2 className="h-5 w-5 shrink-0" /><span>{count} {count === 1 ? "track is" : "tracks are"} still in your library but not currently available to play — the artist may have removed or hidden {count === 1 ? "it" : "them"}.</span></div>;
}
