import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, Square, ExternalLink, Link2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { startLinkBroadcast, endBroadcast, getMyLinkBroadcast, listLinkBroadcasts } from "@/lib/broadcasts.functions";

export const Route = createFileRoute("/broadcast/")({
  head: () => ({
    meta: [
      { title: "Broadcast — Go Live with Your Stream Link | Tunevio" },
      { name: "description", content: "Artists add their live stream link, start and stop their live session, and fans find who's broadcasting now on Tunevio." },
      { property: "og:title", content: "Broadcast on Tunevio" },
      { property: "og:description", content: "Share your live stream link and go live for your fans on Tunevio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BroadcastPage,
});

function BroadcastPage() {
  const { user, roles, rolesLoading } = useAuth();
  const isArtist = roles.includes("artist" as never);
  const qc = useQueryClient();
  const listFn = useServerFn(listLinkBroadcasts);
  const mineFn = useServerFn(getMyLinkBroadcast);
  const startFn = useServerFn(startLinkBroadcast);
  const endFn = useServerFn(endBroadcast);
  const live = useQuery({ queryKey: ["link-broadcasts"], queryFn: () => listFn(), refetchInterval: 15000 });
  const mine = useQuery({ queryKey: ["my-link-broadcast", user?.id], queryFn: () => mineFn(), enabled: !!user && isArtist });
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => { void qc.invalidateQueries({ queryKey: ["link-broadcasts"] }); void qc.invalidateQueries({ queryKey: ["my-link-broadcast"] }); };
  const start = async () => {
    if (busy) return;
    setBusy(true);
    try { await startFn({ data: { stream_title: title || "Live now", url } }); toast.success("You're live"); refresh(); }
    catch (e) { toast.error((e as Error).message || "Could not start"); }
    finally { setBusy(false); }
  };
  const stop = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try { await endFn({ data: { id } }); toast.success("Broadcast ended"); refresh(); }
    catch { toast.error("Could not stop the broadcast"); }
    finally { setBusy(false); }
  };

  const current = mine.data;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Broadcast</h1>
        <p className="text-muted-foreground mt-1">Add your live stream link and let fans know you're on air.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {!user ? (
          <p className="text-muted-foreground"><Link to="/login" className="text-primary underline">Sign in</Link> to start a broadcast.</p>
        ) : rolesLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !isArtist ? (
          <p className="text-muted-foreground">Broadcasting is available to artist accounts.</p>
        ) : current ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold"><Radio className="h-5 w-5 animate-pulse" /> You're live</div>
            <p className="text-foreground font-medium">{current.stream_title}</p>
            <a href={current.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground break-all hover:text-foreground"><ExternalLink className="h-4 w-4 shrink-0" />{current.url}</a>
            <button onClick={() => stop(current.id)} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50">
              <Square className="h-4 w-4" /> Stop live session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">Title
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Friday night session" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground" />
            </label>
            <label className="block text-sm font-medium text-foreground">Live stream URL
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <input value={url} onChange={e => setUrl(e.target.value)} type="url" inputMode="url" placeholder="https://youtube.com/live/…" className="w-full bg-transparent py-2 text-base text-foreground outline-none" />
              </div>
            </label>
            <p className="text-xs text-muted-foreground">YouTube, Twitch, Facebook, Instagram or any https:// link.</p>
            <button onClick={start} disabled={busy || !url.trim()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Radio className="h-4 w-4" /> Start live session
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Live now</h2>
        {live.isLoading ? <p className="text-muted-foreground">Loading…</p>
          : live.isError ? <p className="text-muted-foreground">Couldn't load broadcasts. Try again shortly.</p>
          : !live.data?.length ? <p className="text-muted-foreground">No artists are broadcasting right now.</p>
          : (
            <ul className="space-y-2">
              {live.data.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="min-w-0">
                    <Link to="/artist/$id" params={{ id: b.host_id }} className="font-semibold text-foreground hover:underline">{b.artist}</Link>
                    <p className="truncate text-sm text-muted-foreground">{b.title}</p>
                  </div>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Watch <ExternalLink className="h-4 w-4" /></a>
                </li>
              ))}
            </ul>
          )}
      </section>
    </main>
  );
}
