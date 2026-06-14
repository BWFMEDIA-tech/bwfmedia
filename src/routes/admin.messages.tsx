import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Mail } from "lucide-react";
import { SectionPage } from "@/components/admin/SectionPage";
import { getSectionStats } from "@/lib/admin-sections.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/messages")({
  head: () => ({ meta: [{ title: "Messages — Admin" }, { name: "robots", content: "noindex" }] }),
  component: MessagesAdmin,
});

function MessagesAdmin() {
  const auth = useAuth();
  const fetchStats = useServerFn(getSectionStats);
  const stats = useQuery({ queryKey: ["admin-sections"], queryFn: () => fetchStats(), enabled: auth.roles.includes("admin") });
  return (
    <SectionPage
      title="Messages"
      subtitle="Direct messages and email health across the platform."
      stats={[
        { label: "Direct Messages", value: stats.data?.messagesCount ?? 0, icon: MessageSquare, color: "#3b82f6" },
        { label: "Suppressed Emails", value: stats.data?.suppressedCount ?? 0, icon: Mail, color: "#ef4444" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/messages" className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6 transition hover:border-blue-500/40">
          <MessageSquare className="h-6 w-6 text-blue-400" />
          <div className="mt-3 font-bold">Open Inbox</div>
          <div className="text-xs text-white/50">Your direct messages.</div>
        </Link>
        <Link to="/admin/cancellation-emails" className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6 transition hover:border-red-500/40">
          <Mail className="h-6 w-6 text-red-400" />
          <div className="mt-3 font-bold">Email Health</div>
          <div className="text-xs text-white/50">Cancellation emails and bounce log.</div>
        </Link>
      </div>
    </SectionPage>
  );
}