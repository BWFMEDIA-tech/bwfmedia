import { StreamThumbnailImage } from "@/components/stream/StreamThumbnailImage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Radio, Eye, Trash2, Video, Calendar, Mic2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useLiveStageFeed } from "@/lib/use-live-stage-navigation";
import { stageDestination } from "@/lib/live-stage-navigation";
import { deleteStream } from "@/lib/streams.functions";
import { useAuth } from "@/lib/auth-context";
import { LIVE_CATEGORIES, liveCategoryLabel } from "@/lib/live-categories";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Now — Tunevio" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Discover and join all currently active live streams on Tunevio." },
      { property: "og:title", content: "Live Now on Tunevio" },
      { property: "og:description", content: "Join active live streams from Tunevio artists and hosts." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const feed = useLiveStageFeed();
  const delFn = useServerFn(deleteStream);
  const auth = useAuth();
  const streams = feed.entries;
  const loading = feed.isLoading;
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const visibleStreams = activeCategory === "all"
    ? streams
    : streams.filter((s) => (s.category ?? "") === activeCategory);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this live stream? This cannot be undone.")) return;
    try {
      await delFn({ data: { streamId: id } });
      feed.retry();
      toast.success("Stream deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete");
    }
  };

  return (
    <div className="swara-live min-h-screen bg-background text-foreground pt-8 pb-24 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <span className="inline-flex items-center gap-2 rounded-md bg-destructive px-2 py-1 text-[10px] font-bold tracking-widest">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" /> LIVE NOW
          </span>
          <h1 className="text-2xl font-bold sm:text-3xl">Live on Tunevio</h1>
        </div>
        <div className="my-6 flex flex-wrap gap-3"><Button asChild variant="secondary" className="rounded-full"><Link to="/go-live"><Video />Go live</Link></Button><Button asChild variant="ghost"><Link to="/events"><Calendar />Events</Link></Button><Button asChild variant="ghost"><Link to="/play"><Mic2 />Arena</Link></Button></div>

        <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {[{ id: "all", label: "All" }, ...LIVE_CATEGORIES].map((c) => (
            <Button
              variant="ghost"
              aria-pressed={activeCategory === c.id}
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                activeCategory === c.id
                  ? "border-primary bg-foreground text-background"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {feed.isError ? (
          <div className="py-12 text-center"><p className="mb-4 text-muted-foreground">Live broadcasts are temporarily unavailable.</p><Button onClick={feed.retry}>Retry</Button></div>
        ) : loading ? (
          <p className="text-muted-foreground">Loading live streams…</p>
        ) : visibleStreams.length === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary p-16 text-center">
            <Radio className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">No one's live right now{activeCategory !== "all" ? ` in ${liveCategoryLabel(activeCategory)}` : ""}.</p>
            <p className="text-muted-foreground text-sm">Check back soon — or start your own stream.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleStreams.map((s) => (
              <Link
                key={`${s.kind}:${s.id}`}
                {...stageDestination({ ...s, status: "live" })}
                className="group rounded-2xl border border-border bg-secondary overflow-hidden hover:border-primary/50 transition"
              >
                <div className="relative aspect-video bg-gradient-to-br from-secondary to-background">
                  {s.thumbnail_url && (
                    <StreamThumbnailImage src={s.thumbnail_url} alt={s.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded bg-destructive px-2 py-1 text-[10px] font-bold tracking-wider">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" /> LIVE
                  </span>
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded bg-background/70 px-2 py-1 text-[10px] font-semibold backdrop-blur">
                    <Eye className="h-3 w-3" /> {s.viewer_count ?? 0}
                  </span>
                  {s.kind === "stream" && auth.user?.id === s.host_id && (
                    <Button
                      variant="destructive"
                      onClick={(e) => handleDelete(e, s.id)}
                      title="Delete stream"
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded bg-destructive/90 px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-destructive/80"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground line-clamp-2">{s.title}</h3>
                  {s.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {s.host?.avatar_url ? (
                      <SignedImg src={s.host.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-secondary to-muted" />
                    )}
                    <span className="text-sm text-brand-silver truncate">
                      {s.host?.stage_name || s.host?.display_name || "Tunevio host"}
                    </span>
                  </div>
                  {s.category && (
                    <span className="mt-3 inline-block rounded-md bg-secondary border border-border px-2 py-1 text-[10px] font-semibold text-primary">
                      {liveCategoryLabel(s.category)}
                    </span>
                  )}
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Radio className="h-4 w-4" />Join</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}