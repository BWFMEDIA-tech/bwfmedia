import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shield, Ban, ScrollText, Lock } from "lucide-react";
import { SectionPage, Card } from "@/components/admin/SectionPage";
import { getSectionStats } from "@/lib/admin-sections.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/security")({
  head: () => ({ meta: [{ title: "Security — Admin" }, { name: "robots", content: "noindex" }] }),
  component: SecurityAdmin,
});

function SecurityAdmin() {
  const auth = useAuth();
  const fetchStats = useServerFn(getSectionStats);
  const stats = useQuery({ queryKey: ["admin-sections"], queryFn: () => fetchStats(), enabled: auth.roles.includes("admin") });
  return (
    <SectionPage
      title="Security"
      subtitle="Bans, moderation, and platform safety controls."
      stats={[
        { label: "Active Bans", value: stats.data?.bansCount ?? 0, icon: Ban, color: "#ef4444" },
        { label: "Audit Events", value: stats.data?.auditCount ?? 0, icon: ScrollText, color: "#3b82f6" },
        { label: "Suppressed Emails", value: stats.data?.suppressedCount ?? 0, icon: Lock, color: "#a855f7" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Shield className="h-5 w-5 text-blue-400" />
          <div className="mt-3 font-bold">Moderation Tools</div>
          <div className="mt-1 text-xs text-white/50">Word filter, bans, and live stream controls.</div>
          <Link to="/admin/dashboard" className="mt-4 inline-flex rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Open Live Dashboard</Link>
        </Card>
        <Card>
          <ScrollText className="h-5 w-5 text-violet-400" />
          <div className="mt-3 font-bold">Audit Log</div>
          <div className="mt-1 text-xs text-white/50">Every admin action across the platform.</div>
          <Link to="/admin/audit" className="mt-4 inline-flex rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Open Audit Log</Link>
        </Card>
      </div>
    </SectionPage>
  );
}