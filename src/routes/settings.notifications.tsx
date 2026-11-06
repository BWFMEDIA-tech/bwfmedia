import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell, Card, Row } from "@/components/settings/SettingsShell";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { getPushPublicKey, sendPushTest } from "@/lib/push-settings.functions";
import { subscribePush, unsubscribePush } from "@/lib/notifications.functions";
import { sendAnnouncement } from "@/lib/announcements.functions";

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
  const { user, roles, loading: authLoading } = useAuth();
  const [p, setP] = useState({ in_app: true, email: true, push: false, live_alerts: true, battle_alerts: true, message_alerts: true, follower_alerts: true, music_alerts: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [deviceHint, setDeviceHint] = useState("");
  const publicKeyFn = useServerFn(getPushPublicKey);
  const subscribeFn = useServerFn(subscribePush);
  const unsubscribeFn = useServerFn(unsubscribePush);
  const testFn = useServerFn(sendPushTest);
  const announceFn = useServerFn(sendAnnouncement);
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setDeviceHint("Push notifications aren't supported in this browser."); return; }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (ios && !window.matchMedia("(display-mode: standalone)").matches) setDeviceHint("On iPhone, add Tunevio to your Home Screen, then open it there. Requires iOS 16.4 or later.");
    navigator.serviceWorker.getRegistration("/push/").then(async registration => {
      setDeviceEnabled(Boolean(await registration?.pushManager.getSubscription()));
    }).catch(() => setDeviceHint("Couldn't read notification status."));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) toast.error("Couldn't load notification preferences");
      if (data) setP({ in_app: data.in_app, email: data.email, push: data.push, live_alerts: data.live_alerts, battle_alerts: data.battle_alerts, message_alerts: data.message_alerts, follower_alerts: data.follower_alerts, music_alerts: data.music_alerts });
      setLoading(false);
    });
  }, [user, authLoading]);

  async function update(key: keyof typeof p, value: boolean) {
    if (!user) return;
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, [key]: value }, { onConflict: "user_id" });
    if (error) { toast.error("Couldn't save notification preferences"); return false; }
    setP(current => ({ ...current, [key]: value }));
    return true;
  }

  async function toggleDevice(value: boolean) {
    if (!user) { toast.error("Sign in to manage notifications"); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { toast.error("This browser doesn't support push notifications"); return; }
    if (value && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches) { toast.error("Open Tunevio from your iPhone Home Screen first"); return; }
    setBusy(true);
    try {
      // Request immediately inside the opt-in gesture, before asynchronous network work (iOS).
      const permission = value ? await Notification.requestPermission() : Notification.permission;
      if (value && permission !== "granted") throw new Error("Notifications weren't allowed. You can change this in your device settings.");
      if (!value) {
        const registration = await navigator.serviceWorker.getRegistration("/push/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await unsubscribeFn({ data: { endpoint: subscription.endpoint } });
          await subscription.unsubscribe();
        }
        setDeviceEnabled(false);
        return;
      }
      const { publicKey } = await publicKeyFn();
      const registration = await navigator.serviceWorker.register("/push/worker.js", { scope: "/push/", updateViaCache: "none" });
      if (!registration.active) await new Promise<void>((resolve, reject) => {
        const worker = registration.installing ?? registration.waiting;
        if (!worker) { reject(new Error("Notification connection unavailable")); return; }
        const timeout = setTimeout(() => reject(new Error("Notification connection timed out")), 15000);
        worker.addEventListener("statechange", () => { if (worker.state === "activated") { clearTimeout(timeout); resolve(); } });
      });
      const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - publicKey.length % 4) % 4));
      const applicationServerKey = Uint8Array.from(raw, character => character.charCodeAt(0));
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const json = subscription.toJSON();
      if (!json.keys?.p256dh || !json.keys.auth) throw new Error("Notification keys unavailable");
      await subscribeFn({ data: { endpoint: subscription.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 500) } });
      if (!await update("push", true)) throw new Error("Couldn't save your notification choice");
      setDeviceEnabled(true);
      toast.success("Notifications enabled on this device");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't update notifications"); }
    finally { setBusy(false); }
  }

  async function testDevice() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/push/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw new Error("Enable notifications first");
      const result = await testFn({ data: { endpoint: subscription.endpoint } });
      if (!result.accepted) throw new Error("The push service didn't accept this test. Re-enable notifications and try again.");
      toast.success("Test accepted by the push service; confirm it arrives on your device");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Test failed"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="swara-notification-settings"><SettingsShell title="Notifications">
      <Card>
        <Row label="In-app notifications"><Switch aria-label="In-app notifications" checked={p.in_app} onCheckedChange={(v) => update("in_app", v)} /></Row>
        <Row label="Email"><Switch aria-label="Email notifications" checked={p.email} onCheckedChange={(v) => update("email", v)} /></Row>
        <Row label="Notifications on this device" hint={deviceHint || (deviceEnabled ? "Connected" : "Not enabled")}><Switch aria-label="Enable notifications on this device" disabled={busy || !user} checked={deviceEnabled} onCheckedChange={toggleDevice} /></Row>
        <Row label="Push notifications on all devices"><Switch aria-label="Push notifications" disabled={busy || !user} checked={p.push} onCheckedChange={(v) => v && !deviceEnabled ? toggleDevice(true) : update("push", v)} /></Row>
        <Row label="Live show alerts"><Switch aria-label="Live show alerts" checked={p.live_alerts} onCheckedChange={(v) => update("live_alerts", v)} /></Row>
        <Row label="Battle challenges and updates"><Switch aria-label="Battle alerts" checked={p.battle_alerts} onCheckedChange={(v) => update("battle_alerts", v)} /></Row>
        <Row label="New messages"><Switch aria-label="Message alerts" checked={p.message_alerts} onCheckedChange={(v) => update("message_alerts", v)} /></Row>
        <Row label="New followers"><Switch aria-label="Follower alerts" checked={p.follower_alerts} onCheckedChange={(v) => update("follower_alerts", v)} /></Row>
        <Row label="Music from followed artists"><Switch aria-label="Music alerts" checked={p.music_alerts} onCheckedChange={(v) => update("music_alerts", v)} /></Row>
        <Button variant="outline" className="mt-4" disabled={!deviceEnabled || !p.push || busy} onClick={testDevice}>Send test notification</Button>
      </Card>
      {(roles.includes("host") || roles.includes("admin")) && <Card title="Live event announcement">
        <input aria-label="Event announcement" className="w-full rounded border border-border bg-background px-3 py-2 text-foreground" maxLength={120} value={eventTitle} onChange={event => setEventTitle(event.target.value)} placeholder="Event title" />
        <Button className="mt-3" disabled={busy || !eventTitle.trim()} onClick={async () => {
          if (!confirm("Send this live event announcement to Tunevio members?")) return;
          setBusy(true);
          try { await announceFn({ data: { kind: "event", title: eventTitle.trim(), link: "/live", audiences: ["everyone"], email: false } }); setEventTitle(""); toast.success("Event announcement sent"); }
          catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't announce event"); }
          finally { setBusy(false); }
        }}>Announce live event</Button>
      </Card>}
    </SettingsShell></div>
  );
}