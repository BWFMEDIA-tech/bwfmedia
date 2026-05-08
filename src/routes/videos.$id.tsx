import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Music2, Megaphone, Calendar } from "lucide-react";
import bwfLogo from "@/assets/bwf-logo.png";
import grunge from "@/assets/grunge-bg.jpg";

export const Route = createFileRoute("/videos/$id")({
  component: VideoDetailPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-bone bg-black p-6">
      <div className="text-center">
        <p className="text-blood font-cond uppercase tracking-widest mb-3">Error</p>
        <p className="text-bone/70">{error.message}</p>
        <Link to="/videos" className="inline-block mt-6 px-4 py-2 bg-blood text-bone font-cond uppercase tracking-widest text-xs">
          Back to Videos
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-bone bg-black">
      <div className="text-center">
        <p className="font-display text-5xl uppercase">Video not found</p>
        <Link to="/videos" className="inline-block mt-6 px-4 py-2 bg-blood text-bone font-cond uppercase tracking-widest text-xs">
          Back to Videos
        </Link>
      </div>
    </div>
  ),
});

type VideoRow = {
  id: string;
  user_id: string;
  title: string;
  artist: string | null;
  description: string | null;
  category: "music" | "sponsored";
  storage_path: string;
  external_url: string | null;
  created_at: string;
};

function VideoDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [video, setVideo] = useState<VideoRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("videos").select("*").eq("id", id).maybeSingle();
      setVideo(data as VideoRow | null);
      setLoading(false);
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!video || !confirm(`Delete "${video.title}"?`)) return;
    await supabase.storage.from("videos").remove([video.storage_path]);
    await supabase.from("videos").delete().eq("id", video.id);
    router.navigate({ to: "/videos" });
  };

  const publicUrl = video ? supabase.storage.from("videos").getPublicUrl(video.storage_path).data.publicUrl : "";

  return (
    <div
      className="min-h-screen text-bone"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.88), rgba(0,0,0,0.96)), url(${grunge})`,
        backgroundSize: "cover",
      }}
    >
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-black/85 border-b border-blood/40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={bwfLogo} alt="BWF Media" className="w-14 h-14 object-contain" />
          </Link>
          <Link
            to="/videos"
            className="px-4 py-2 font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone/70 hover:text-bone flex items-center gap-2"
          >
            <ArrowLeft size={14} /> All Videos
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 md:px-12 py-10">
        {loading ? (
          <p className="text-bone/50">Loading…</p>
        ) : !video ? (
          <div className="text-center py-20">
            <p className="font-display text-4xl uppercase">Not found</p>
          </div>
        ) : (
          <article>
            <div className="aspect-video bg-black border border-blood/40 mb-8">
              <video src={publicUrl} controls autoPlay className="w-full h-full object-contain bg-black" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span
                className="px-2 py-1 font-cond font-bold tracking-[0.25em] text-[10px] uppercase text-bone flex items-center gap-1"
                style={{ backgroundColor: video.category === "sponsored" ? "#0a7" : "var(--blood)" }}
              >
                {video.category === "sponsored" ? <Megaphone size={11} /> : <Music2 size={11} />}
                {video.category}
              </span>
              <span className="text-bone/50 text-xs flex items-center gap-1.5 font-cond uppercase tracking-widest">
                <Calendar size={12} />
                {new Date(video.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl uppercase leading-[0.9]">{video.title}</h1>
            {video.artist && (
              <p className="mt-3 text-xl text-bone/80 font-cond uppercase tracking-[0.2em]">{video.artist}</p>
            )}

            {video.description && (
              <div className="mt-8 max-w-3xl">
                <p className="text-bone/70 text-lg leading-relaxed whitespace-pre-line">{video.description}</p>
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-3">
              {video.external_url && (
                <a
                  href={video.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 font-cond font-bold tracking-[0.25em] text-[11px] uppercase text-bone flex items-center gap-2"
                  style={{ backgroundColor: "var(--blood)" }}
                >
                  <ExternalLink size={14} /> Visit Link
                </a>
              )}
              {userId === video.user_id && (
                <button
                  onClick={handleDelete}
                  className="px-5 py-3 border font-cond font-bold tracking-[0.25em] text-[11px] uppercase hover:bg-blood hover:text-bone transition-colors"
                  style={{ borderColor: "var(--blood)", color: "var(--blood)" }}
                >
                  Delete Video
                </button>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}