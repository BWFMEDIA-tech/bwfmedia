import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ListOrdered } from "lucide-react";
import { SectionPage } from "@/components/admin/SectionPage";
import { getSectionStats } from "@/lib/admin-sections.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/events")({
  head: () => ({ meta: [{ title: "Events — Admin" }, { name: "robots", content: "noindex" }] }),
  component: EventsAdmin,
});

function EventsAdmin() {
  const auth = useAuth();
  const fetchStats = useServerFn(getSectionStats);
  const stats = useQuery({ queryKey: ["admin-sections"], queryFn: () => fetchStats(), enabled: auth.roles.includes("admin") });
  return (
    <SectionPage
      title="Events"
      subtitle="Studio bookings, live review submissions, and scheduled events."
      stats={[
        { label: "Studio Bookings", value: stats.data?.bookingsCount ?? 0, icon: Calendar, color: "#3b82f6" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/bookings" className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6 transition hover:border-blue-500/40">
          <Calendar className="h-6 w-6 text-blue-400" />
          <div className="mt-3 font-bold">Bookings</div>
          <div className="text-xs text-white/50">Studio and block booking requests.</div>
        </Link>
      </div>
    </SectionPage>
  );
}