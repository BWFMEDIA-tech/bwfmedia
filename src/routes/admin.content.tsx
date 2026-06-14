import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, Video, Mic } from "lucide-react";
import { SectionPage } from "@/components/admin/SectionPage";
import { getSectionStats } from "@/lib/admin-sections.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/content")({
  head: () => ({ meta: [{ title: "Content — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ContentAdmin,
});

function ContentAdmin() {
  const auth = useAuth();
  const fetchStats = useServerFn(getSectionStats);
  const stats = useQuery({ queryKey: ["admin-sections"], queryFn: () => fetchStats(), enabled: auth.roles.includes("admin") });
  return (
    <SectionPage
      title="Content"
      subtitle="Videos, recordings, and uploaded media across the network."
      stats={[
        { label: "Videos", value: stats.data?.videosCount ?? 0, icon: Video, color: "#3b82f6" },
        { label: "Stream Recordings", value: stats.data?.recordingsCount ?? 0, icon: Mic, color: "#ef4444" },
        { label: "All Content", value: (stats.data?.videosCount ?? 0) + (stats.data?.recordingsCount ?? 0), icon: PlayCircle, color: "#a855f7" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/videos" className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6 transition hover:border-blue-500/40">
          <Video className="h-6 w-6 text-blue-400" />
          <div className="mt-3 font-bold">Videos Library</div>
          <div className="text-xs text-white/50">Browse and moderate uploaded videos.</div>
        </Link>
        <Link to="/recordings" className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6 transition hover:border-red-500/40">
          <Mic className="h-6 w-6 text-red-400" />
          <div className="mt-3 font-bold">Stream Recordings</div>
          <div className="text-xs text-white/50">Past live broadcasts and replays.</div>
        </Link>
      </div>
    </SectionPage>
  );
}