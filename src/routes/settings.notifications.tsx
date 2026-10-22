import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell, Card, Row } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/notifications")({
  head: () => ({ meta: [
    { title: "Notification Preferences | Tunevio" },
    { name: "description", content: "Manage your Tunevio in-app, email, push and live show notifications." },
    { property: "og:title", content: "Notification Preferences | Tunevio" },
    { property: "og:description", content: "Manage your Tunevio in-app, email, push and live show notifications." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const [p, setP] = useState({ in_app: true, email: true, push: true, live_alerts: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setP({ in_app: data.in_app, email: data.email, push: data.push, live_alerts: data.live_alerts });
      setLoading(false);
    });
  }, [user]);

  async function update(key: keyof typeof p, value: boolean) {
    if (!user) return;
    const next = { ...p, [key]: value };
    setP(next);
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next });
    if (error) toast.error(error.message);
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <div className="swara-notification-settings"><SettingsShell title="Notifications">
      <Card>
        <Row label="In-app notifications"><Switch aria-label="In-app notifications" checked={p.in_app} onCheckedChange={(v) => update("in_app", v)} /></Row>
        <Row label="Email"><Switch aria-label="Email notifications" checked={p.email} onCheckedChange={(v) => update("email", v)} /></Row>
        <Row label="Push"><Switch aria-label="Push notifications" checked={p.push} onCheckedChange={(v) => update("push", v)} /></Row>
        <Row label="Live show alerts"><Switch aria-label="Live show alerts" checked={p.live_alerts} onCheckedChange={(v) => update("live_alerts", v)} /></Row>
      </Card>
    </SettingsShell></div>
  );
}