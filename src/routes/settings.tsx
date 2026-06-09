import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BWF Network" },
      { name: "description", content: "Profile, account, devices, and stream preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type Prefs = { in_app: boolean; email: boolean; push: boolean; live_alerts: boolean };

function SettingsPage() {
  const auth = useAuth();
  const getPrefs = useServerFn(getNotificationPreferences);
  const savePrefs = useServerFn(updateNotificationPreferences);
  const [prefs, setPrefs] = useState<Prefs>({ in_app: true, email: true, push: true, live_alerts: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.isAuthenticated) { setLoading(false); return; }
    getPrefs({ data: {} as any })
      .then((p: any) => setPrefs({ in_app: !!p.in_app, email: !!p.email, push: !!p.push, live_alerts: !!p.live_alerts }))
      .finally(() => setLoading(false));
  }, [auth.isAuthenticated]);

  const toggle = async (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await savePrefs({ data: { [key]: next[key] } as any });
      toast.success("Preferences updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
      setPrefs(prefs);
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center">
        <p className="text-white/60">Sign in to manage your settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] text-white px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-white/60 mb-8">Manage how BWF Network reaches you.</p>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-violet-400" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          {loading ? (
            <p className="text-white/50 text-sm">Loading…</p>
          ) : (
            <div className="space-y-3">
              <Toggle label="In-app notifications" desc="Show alerts in the notification center." value={prefs.in_app} onChange={() => toggle("in_app")} />
              <Toggle label="Email notifications" desc="Receive transactional emails." value={prefs.email} onChange={() => toggle("email")} />
              <Toggle label="Web push" desc="Browser push notifications when enabled." value={prefs.push} onChange={() => toggle("push")} />
              <Toggle label="Live stream alerts" desc="Notify me when a host goes live." value={prefs.live_alerts} onChange={() => toggle("live_alerts")} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-white/50">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${value ? "bg-violet-500" : "bg-white/15"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}