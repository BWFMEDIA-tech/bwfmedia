import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Star, Users, Radio } from "lucide-react";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { getSectionStats } from "@/lib/admin-sections.functions";
import { getAdminOverview } from "@/lib/admin-overview.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/artists")({
  head: () => ({ meta: [{ title: "Artists — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ArtistsAdmin,
});

function ArtistsAdmin() {
  const auth = useAuth();
  const isAdmin = auth.roles.includes("admin");
  const fetchStats = useServerFn(getSectionStats);
  const fetchOverview = useServerFn(getAdminOverview);
  const stats = useQuery({ queryKey: ["admin-sections"], queryFn: () => fetchStats(), enabled: isAdmin });
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview(), enabled: isAdmin });

  return (
    <SectionPage
      title="Artists"
      subtitle="Verified artists, performance and rankings."
      stats={[
        { label: "Total Artists", value: stats.data?.artistsCount ?? 0, icon: Star, color: "#a855f7" },
        { label: "Live Streams", value: overview.data?.cards.liveStreams.value ?? 0, icon: Radio, color: "#ef4444" },
        { label: "Total Users", value: stats.data?.profilesCount ?? 0, icon: Users, color: "#3b82f6" },
      ]}
      ctaLabel="Manage Roles"
      ctaTo="/admin/users"
    >
      <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
        <h2 className="mb-4 text-lg font-bold">Top Artists</h2>
        {!overview.data?.topArtists.length ? (
          <EmptyState icon={Star} title="No artists yet" hint="Assign the artist role from User Management." />
        ) : (
          <div className="divide-y divide-white/5">
            {overview.data.topArtists.map((a: any, i: number) => (
              <Link key={a.id} to="/artist/$id" params={{ id: a.id }} className="flex items-center gap-3 py-3 hover:bg-white/[0.02]">
                <span className="w-6 text-center text-xs text-white/40">{i + 1}</span>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold">
                  {(a.profile?.display_name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{a.profile?.stage_name || a.profile?.display_name || "Artist"}</div>
                  <div className="text-xs text-white/40">{a.streams} streams</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SectionPage>
  );
}