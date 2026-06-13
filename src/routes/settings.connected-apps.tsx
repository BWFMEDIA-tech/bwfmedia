import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/connected-apps")({ component: ConnectedAppsPage });

const PROVIDERS = [
  { key: "spotify", label: "Spotify", color: "bg-green-600" },
  { key: "apple_music", label: "Apple Music", color: "bg-pink-600" },
  { key: "soundcloud", label: "SoundCloud", color: "bg-orange-600" },
  { key: "instagram", label: "Instagram", color: "bg-gradient-to-br from-pink-500 to-purple-600" },
];

function ConnectedAppsPage() {
  const { user } = useAuth();
  const [conn, setConn] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!user) return;
    const { data } = await supabase.from("connected_apps").select("*").eq("user_id", user.id);
    setConn(data ?? []); setLoading(false);
  }
  useEffect(() => { refresh(); }, [user]);

  async function connect(provider: string) {
    if (!user) return;
    const { error } = await supabase.from("connected_apps").upsert({ user_id: user.id, provider, account_label: user.email });
    if (error) return toast.error(error.message);
    toast.success("Connected (placeholder — OAuth coming soon)"); refresh();
  }
  async function disconnect(id: string) { await supabase.from("connected_apps").delete().eq("id", id); refresh(); }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Connected Apps" blurb="Link external services to your profile.">
      <Card title="Available" icon={<Plug className="h-4 w-4 text-red-500" />}>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROVIDERS.map((p) => {
            const c = conn.find((x) => x.provider === p.key);
            return (
              <div key={p.key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-md text-sm font-bold text-white ${p.color}`}>{p.label[0]}</div>
                  <div><div className="text-sm font-semibold">{p.label}</div><div className="text-xs text-white/50">{c ? `Connected · ${c.account_label}` : "Not connected"}</div></div>
                </div>
                {c ? <button onClick={() => disconnect(c.id)} className="rounded-md border border-white/10 px-3 py-1 text-xs hover:bg-white/5">Disconnect</button>
                  : <button onClick={() => connect(p.key)} className="rounded-md bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500">Connect</button>}
              </div>
            );
          })}
        </div>
      </Card>
    </SettingsShell>
  );
}