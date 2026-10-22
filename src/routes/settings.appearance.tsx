import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell, Card, Row } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/appearance")({ head: () => ({ meta: [{ title: "Appearance & Playback — Tunevio" }, { name: "description", content: "Manage your Tunevio appearance and saved playback preferences." }, { property: "og:title", content: "Appearance & Playback — Tunevio" }, { property: "og:description", content: "Your Tunevio appearance and playback preferences." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: AppearancePage });

const ACCENTS = [{ value: "#00E6FF", label: "Cyan", token: "swara-swatch-cyan" }, { value: "#0000FF", label: "Blue", token: "swara-swatch-blue" }, { value: "#B8C2D0", label: "Silver", token: "swara-swatch-silver" }, { value: "#004BFF", label: "Electric blue", token: "swara-swatch-electric" }];

function AppearancePage() {
  const { user } = useAuth();
  const [s, setS] = useState({ theme: "dark", accent_color: "#00E6FF", language: "en", autoplay: true, crossfade_seconds: 0, audio_quality: "high", email_marketing: false, email_product: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setS(data as any);
      setLoading(false);
    });
  }, [user]);

  async function update<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    if (!user) return;
    const next = { ...s, [key]: value };
    setS(next);
    const { error } = await supabase.from("user_settings").upsert({ user_id: user.id, ...next });
    if (error) toast.error(error.message);
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <SettingsShell title="Appearance & playback">
      <Card title="Theme">
        <div className="grid grid-cols-3 gap-2">
          {([{ k: "dark", L: "Dark", I: Moon }, { k: "light", L: "Light", I: Sun }, { k: "system", L: "System", I: Monitor }] as const).map(({ k, L, I }) => (
            <Button variant="outline" aria-pressed={s.theme === k} key={k} onClick={() => update("theme", k)} className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-xs ${s.theme === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:bg-muted"}`}>
              <I className="h-5 w-5" />{L}
            </Button>
          ))}
        </div>
      </Card>
      <Card title="Accent Color">
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((c) => (
            <Button variant="outline" size="icon" key={c.value} title={c.label} aria-label={`${c.label} accent`} aria-pressed={s.accent_color === c.value} onClick={() => update("accent_color", c.value)} className={`h-10 w-10 rounded-full border-2 ${c.token} ${s.accent_color === c.value ? "border-foreground" : "border-border"}`} />
          ))}
        </div>
      </Card>
      <Card title="Playback">
        <Row label="Autoplay"><Switch aria-label="Autoplay preference" checked={s.autoplay} onCheckedChange={(v) => update("autoplay", v)} /></Row>
        <Row label="Audio quality">
          <select aria-label="Audio quality preference" value={s.audio_quality} onChange={(e) => update("audio_quality", e.target.value)} className="rounded-md border border-border bg-secondary px-2 py-1.5 text-xs">
            <option value="auto">Auto</option><option value="normal">Normal</option><option value="high">High</option><option value="very_high">Very High</option>
          </select>
        </Row>
      </Card>
    </SettingsShell>
  );
}