import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";

export const Route = createFileRoute("/settings/social-links")({ component: SocialsPage });

function SocialsPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_social_links").select("*").eq("user_id", user.id).order("sort_order").then(({ data }) => {
      setLinks(data ?? []); setLoading(false);
    });
  }, [user]);

  async function add() {
    if (!user) return;
    const { data, error } = await supabase.from("user_social_links").insert({ user_id: user.id, provider: "Custom", handle: "", url: "https://", enabled: true, sort_order: links.length }).select().maybeSingle();
    if (error) return toast.error(error.message);
    setLinks((c) => [...c, data]);
  }
  async function update(id: string, patch: any) {
    setLinks((c) => c.map((l) => l.id === id ? { ...l, ...patch } : l));
    await supabase.from("user_social_links").update(patch).eq("id", id);
  }
  async function remove(id: string) {
    setLinks((c) => c.filter((l) => l.id !== id));
    await supabase.from("user_social_links").delete().eq("id", id);
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Social Links" blurb="Links shown on your public profile." actions={<button onClick={add} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-500"><Plus className="h-3.5 w-3.5" />Add</button>}>
      <Card>
        {links.length === 0 ? <div className="py-8 text-center text-sm text-white/50">No links yet.</div> : (
          <div className="space-y-2">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <input value={l.provider} onChange={(e) => update(l.id, { provider: e.target.value })} placeholder="Provider" className="w-32 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" />
                <input value={l.handle ?? ""} onChange={(e) => update(l.id, { handle: e.target.value })} placeholder="@handle" className="w-40 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" />
                <input value={l.url} onChange={(e) => update(l.id, { url: e.target.value })} placeholder="https://" className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" />
                <Switch checked={l.enabled} onCheckedChange={(v) => update(l.id, { enabled: v })} />
                <button onClick={() => remove(l.id)} className="rounded-md p-2 text-white/40 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </SettingsShell>
  );
}