import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings, Mail, Crown } from "lucide-react";
import { SectionPage, Card } from "@/components/admin/SectionPage";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "System Settings — Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsAdmin,
});

function SettingsAdmin() {
  return (
    <SectionPage title="System Settings" subtitle="Configure platform-wide preferences.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Settings className="h-5 w-5 text-blue-400" />
          <div className="mt-3 font-bold">Account Settings</div>
          <div className="mt-1 text-xs text-white/50">Your own profile, security, and preferences.</div>
          <Link to="/settings" className="mt-4 inline-flex rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Open</Link>
        </Card>
        <Card>
          <Mail className="h-5 w-5 text-violet-400" />
          <div className="mt-3 font-bold">Email Configuration</div>
          <div className="mt-1 text-xs text-white/50">Templates, suppression list, deliverability.</div>
          <Link to="/admin/cancellation-emails" className="mt-4 inline-flex rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Open</Link>
        </Card>
        <Card>
          <Crown className="h-5 w-5 text-amber-400" />
          <div className="mt-3 font-bold">Plan & Billing</div>
          <div className="mt-1 text-xs text-white/50">BWF PRO Admin — manage subscription.</div>
          <Link to="/settings/billing" className="mt-4 inline-flex rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">Open</Link>
        </Card>
      </div>
    </SectionPage>
  );
}