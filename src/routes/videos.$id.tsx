import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSignedVideoUrl } from "@/lib/video-urls";
import {
  getVideoDetail,
  getVideoEngagement,
  setVideoReaction,
  setVideoSaved,
  getSavedVideos,
} from "@/lib/video-engagement.functions";
import { MusicVideoPlayer } from "@/components/site/MusicVideoPlayer";
import { VideoComments, CommentAvatar } from "@/components/site/VideoComments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  MoreHorizontal,
  Calendar,
  LoaderCircle,
  ExternalLink,
} from "lucide-react";
import logo from "@/assets/tunevio-logo.png.asset.json";

export const Route = createFileRoute("/videos/$id")({
  component: VideoDetailPage,
  head: () => ({
    meta: [
      { title: "Music Videos | TUNEVIO" },
      {
        name: "description",
        content:
          "Watch independent music videos, share your favorites and join the conversation on TUNEVIO.",
      },
      { property: "og:title", content: "Music Videos | TUNEVIO" },
      {
        property: "og:description",
        content:
          "Watch independent music videos, share your favorites and join the conversation on TUNEVIO.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function VideoDetailPage() {
  const { id } = Route.useParams();
  const { user, loading, roles } = useAuth();
  const router = useRouter(),
    qc = useQueryClient();
  const fetch = useServerFn(getVideoDetail),
    engagement = useServerFn(getVideoEngagement),
    react = useServerFn(setVideoReaction),
    save = useServerFn(setVideoSaved),
    savedFetch = useServerFn(getSavedVideos);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [library, setLibrary] = useState(false);
  const lock = useRef(false);
  const detail = useQuery({
    queryKey: ["video-detail", id, user?.id],
    enabled: !!user,
    queryFn: () => fetch({ data: { id } }),
  });
  const stats = useQuery({
    queryKey: ["video-engagement", id, "toolbar", user?.id],
    enabled: !!user && !!detail.data?.video,
    queryFn: () => engagement({ data: { videoId: id, sort: "top", offset: 0, parentId: null } }),
    refetchInterval: 30000,
  });
  const saved = useQuery({
    queryKey: ["saved-videos", user?.id],
    enabled: !!user && library,
    queryFn: () => savedFetch(),
  });
  const v = detail.data?.video,
    a = detail.data?.artist;
  const src = useSignedVideoUrl(v?.storage_path),
    poster = useSignedVideoUrl(v?.thumbnail_path);
  const action = async (work: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      await qc.invalidateQueries({ queryKey: ["video-engagement", id] });
      await qc.invalidateQueries({ queryKey: ["saved-videos"] });
    } catch (e) {
      console.error("[video action]", e);
      setError("Could not save this action. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  async function share() {
    const url = `${window.location.origin}/videos/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: v?.title ?? "TUNEVIO video", url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError("Could not share this link. Please try again.");
    }
  }
  async function deleteVideo() {
    if (!v || !confirm(`Delete “${v.title}” and its comments?`)) return;
    await action(async () => {
      // Remove the database row first so a failed delete never leaves a broken player.
      const result = await supabase.from("videos").delete().eq("id", id).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("Unable to delete this video");
      const files = [v.storage_path, v.thumbnail_path].filter((p): p is string => !!p);
      const cleanup = await supabase.storage.from("videos").remove(files);
      if (cleanup.error) console.error("[video file cleanup]", cleanup.error);
      await router.navigate({ to: "/videos" });
    });
  }
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <nav className="border-b border-border bg-background/95">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-8">
          <Link to="/" className="min-w-0">
            <img src={logo.url} alt="Tunevio" className="h-auto w-32 object-contain sm:w-40" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/videos">
              <ArrowLeft />
              All Videos
            </Link>
          </Button>
        </div>
      </nav>
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        {loading || (user && detail.isLoading) ? (
          <p className="flex items-center gap-2 py-16 text-muted-foreground">
            <LoaderCircle className="animate-spin" />
            Loading video…
          </p>
        ) : !user ? (
          <div className="py-16">
            <h1 className="font-display text-3xl uppercase">TUNEVIO Music Videos</h1>
            <Button asChild className="mt-5">
              <Link to="/auth">Sign in to watch</Link>
            </Button>
          </div>
        ) : detail.error ? (
          <div role="alert" className="py-16">
            <p>Video could not load.</p>
            <Button variant="outline" className="mt-4" onClick={() => void detail.refetch()}>
              Try again
            </Button>
          </div>
        ) : !v ? (
          <h1 className="py-16 text-3xl">Video not found</h1>
        ) : (
          <>
            <MusicVideoPlayer key={v.id} src={src} poster={poster} title={v.title} />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-md border border-primary/35 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase text-primary">
                {v.category}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar size={13} />
                {new Date(v.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <h1 className="mt-4 break-words font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
              {v.title}
            </h1>
            <Link
              to="/artist/$id"
              params={{ id: a?.public_id || v.user_id }}
              className="mt-4 flex w-fit min-w-0 items-center gap-3 text-brand-silver hover:text-primary"
            >
              <CommentAvatar src={a?.avatar_url} name={a?.stage_name || v.artist || "Artist"} />
              <div className="min-w-0">
                <p className="break-words font-semibold">
                  {a?.stage_name || v.artist || a?.display_name || "Artist"}
                </p>
                {a?.username && <p className="text-xs text-muted-foreground">@{a.username}</p>}
              </div>
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <div className="flex divide-x divide-border overflow-hidden rounded-full border border-border bg-secondary">
                <Button
                  variant="ghost"
                  disabled={busy || !stats.data}
                  aria-label="Like video"
                  aria-pressed={stats.data?.reaction === "like"}
                  className={`rounded-none px-4 ${stats.data?.reaction === "like" ? "text-primary" : ""}`}
                  onClick={() =>
                    void action(() =>
                      react({
                        data: {
                          videoId: id,
                          reaction: stats.data?.reaction === "like" ? null : "like",
                        },
                      }),
                    )
                  }
                >
                  <ThumbsUp />
                  {stats.data?.likes ?? 0}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || !stats.data}
                  aria-label="Dislike video"
                  aria-pressed={stats.data?.reaction === "dislike"}
                  className={`rounded-none px-4 ${stats.data?.reaction === "dislike" ? "text-primary" : ""}`}
                  onClick={() =>
                    void action(() =>
                      react({
                        data: {
                          videoId: id,
                          reaction: stats.data?.reaction === "dislike" ? null : "dislike",
                        },
                      }),
                    )
                  }
                >
                  <ThumbsDown />
                  {stats.data?.dislikes ?? 0}
                </Button>
              </div>
              <Button variant="secondary" className="rounded-full" onClick={() => void share()}>
                <Share2 />
                Share
              </Button>
              <Button
                variant="secondary"
                disabled={busy || !stats.data}
                aria-pressed={stats.data?.saved ?? false}
                className={`rounded-full ${stats.data?.saved ? "text-primary" : ""}`}
                onClick={() =>
                  void action(() => save({ data: { videoId: id, saved: !stats.data?.saved } }))
                }
              >
                <Bookmark fill={stats.data?.saved ? "currentColor" : "none"} />
                {stats.data?.saved ? "Saved" : "Save"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full"
                    aria-label="More video actions"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setLibrary(!library)}>
                    {library ? "Hide" : "View"} saved videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void share()}>
                    Copy / share link
                  </DropdownMenuItem>
                  {(user.id === v.user_id || roles.includes("admin")) && (
                    <DropdownMenuItem disabled={busy} onSelect={() => void deleteVideo()}>
                      Delete video
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {v.external_url && /^https?:\/\//.test(v.external_url) && (
                <Button asChild variant="ghost">
                  <a href={v.external_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    Visit link
                  </a>
                </Button>
              )}
            </div>
            {stats.error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                Reactions could not load.{" "}
                <Button variant="link" onClick={() => void stats.refetch()}>
                  Try again
                </Button>
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="mt-3 text-sm text-primary">
                {notice}
              </p>
            )}
            {library && (
              <section className="mt-6 border-y border-border py-5">
                <h2 className="mb-3 font-semibold">Saved videos</h2>
                {saved.isLoading ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : saved.error ? (
                  <p className="text-destructive">Saved videos could not load.</p>
                ) : saved.data?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved videos yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {saved.data?.map((s) => (
                      <li key={s.video_id}>
                        <Link
                          to="/videos/$id"
                          params={{ id: s.video_id }}
                          className="break-words text-sm hover:text-primary"
                        >
                          {s.videos?.title || "Video"}
                          {s.videos?.artist ? ` · ${s.videos.artist}` : ""}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {v.description && (
              <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {v.description}
              </p>
            )}
            <VideoComments key={id} videoId={id} />
          </>
        )}
      </main>
    </div>
  );
}
