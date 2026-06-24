import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Eye, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listLiveStreams } from "@/lib/live-broadcast.functions";
import { deleteStream } from "@/lib/streams.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SignedImg } from "@/components/ui/signed-img";

type LiveStream = {
  id: string;
  title: string;
  room_name: string;
  category: string | null;
  thumbnail_url: string | null;
  viewer_count: number;
  started_at: string | null;
  host_id: string;
  host: { display_name: string | null; avatar_url: string | null; stage_name: string | null } | null;
};

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Now — BWF Network" },
      { name: "description", content: "Discover and join all currently active live streams on BWF Network." },
      { property: "og:title", content: "Live Now on BWF Network" },
      { property: "og:description", content: "Join active live streams from BWF artists and hosts." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const fetchLive = useServerFn(listLiveStreams);
  const delFn = useServerFn(deleteStream);
  const auth = useAuth();
  const isAdmin = auth.roles?.includes("admin");
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetchLive({ data: { limit: 50 } })
        .then((r) => { if (!cancelled) { setStreams(r.streams as LiveStream[]); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); });
    };
    refresh();
    const ch = supabase
      .channel("live-now")
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this live stream? This cannot be undone.")) return;
    try {
      await delFn({ data: { streamId: id } });
      setStreams((prev) => prev.filter((s) => s.id !== id));
      toast.success("Stream deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-[#050509] text-white pt-24 pb-12 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center gap-2 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold tracking-widest">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE NOW
          </span>
          <h1 className="text-3xl font-bold">Live on BWF Network</h1>
        </div>
        <p className="text-white/60 mb-8">Drop into any active stream. Listen, react, or request the stage.</p>

        {loading ? (
          <p className="text-white/50">Loading live streams…</p>
        ) : streams.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-16 text-center">
            <Radio className="mx-auto h-10 w-10 text-white/30 mb-3" />
            <p className="text-white/60 mb-2">No one's live right now.</p>
            <p className="text-white/40 text-sm">Check back soon — or start your own stream.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {streams.map((s) => (
              <Link
                key={s.id}
                to="/stream/$room"
                params={{ room: s.room_name }}
                className="group rounded-2xl border border-white/10 bg-[#0d0d18] overflow-hidden hover:border-violet-500/50 transition"
              >
                <div className="relative aspect-video bg-gradient-to-br from-violet-900 to-blue-900">
                  {s.thumbnail_url && (
                    <img src={s.thumbnail_url} alt={s.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded bg-red-600 px-2 py-1 text-[10px] font-bold tracking-wider">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                  </span>
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold backdrop-blur">
                    <Eye className="h-3 w-3" /> {s.viewer_count ?? 0}
                  </span>
                  {(isAdmin || auth.user?.id === s.host_id) && (
                    <button
                      onClick={(e) => handleDelete(e, s.id)}
                      title="Delete stream"
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded bg-red-600/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-500"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white line-clamp-2">{s.title}</h3>
                  <div className="mt-3 flex items-center gap-2">
                    {s.host?.avatar_url ? (
                      <SignedImg src={s.host.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500" />
                    )}
                    <span className="text-sm text-white/80 truncate">
                      {s.host?.stage_name || s.host?.display_name || "BWF host"}
                    </span>
                  </div>
                  {s.category && (
                    <span className="mt-3 inline-block rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60">
                      {s.category}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}