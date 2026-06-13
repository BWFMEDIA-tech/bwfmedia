import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Moon, Sun, Monitor } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell, Card, Row } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/appearance")({ component: AppearancePage });

const ACCENTS = ["#E50914", "#FF00A6", "#00E6FF", "#004BFF", "#C53DFF", "#10B981"];

function AppearancePage() {
  const { user } = useAuth();
  const [s, setS] = useState({ theme: "dark", accent_color: "#E50914", language: "en", autoplay: true, crossfade_seconds: 0, audio_quality: "high", email_marketing: false, email_product: true });
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

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Appearance" blurb="Theme and playback preferences.">
      <Card title="Theme">
        <div className="grid grid-cols-3 gap-2">
          {([{ k: "dark", L: "Dark", I: Moon }, { k: "light", L: "Light", I: Sun }, { k: "system", L: "System", I: Monitor }] as const).map(({ k, L, I }) => (
            <button key={k} onClick={() => update("theme", k)} className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-xs ${s.theme === k ? "border-red-600 bg-red-600/10 text-red-400" : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"}`}>
              <I className="h-5 w-5" />{L}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Accent Color">
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((c) => (
            <button key={c} onClick={() => update("accent_color", c)} className={`h-10 w-10 rounded-full border-2 ${s.accent_color === c ? "border-white" : "border-white/10"}`} style={{ background: c }} />
          ))}
        </div>
      </Card>
      <Card title="Playback">
        <Row label="Autoplay"><Switch checked={s.autoplay} onCheckedChange={(v) => update("autoplay", v)} /></Row>
        <Row label="Audio quality">
          <select value={s.audio_quality} onChange={(e) => update("audio_quality", e.target.value)} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs">
            <option value="auto">Auto</option><option value="normal">Normal</option><option value="high">High</option><option value="very_high">Very High</option>
          </select>
        </Row>
      </Card>
    </SettingsShell>
  );
}