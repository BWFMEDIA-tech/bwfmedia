import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { PROFILE_PLATFORMS, safePlatformUrl } from "@/lib/profile-platforms";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/settings/connected-apps")({
  head: () => ({ meta: [
    { title: "Connected Platforms — TUNEVIO" },
    { name: "description", content: "Manage Twitch, YouTube, Facebook, TikTok and Kick links on your Tunevio profile." },
    { property: "og:title", content: "Connected Platforms — TUNEVIO" },
    { property: "og:description", content: "Manage your artist and host platform links on Tunevio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConnectedAppsPage,
});

type SocialLink = Tables<"user_social_links">;
function ConnectedAppsPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    void supabase.from("user_social_links").select("*").eq("user_id", user.id).order("sort_order").then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else {
        setLinks(data ?? []);
        setDrafts(Object.fromEntries((data ?? []).map(l => [l.provider.toLowerCase(), l.url])));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id, authLoading]);

  async function save(key: string, enabled?: boolean) {
    if (!user) return;
    const existing = links.find(l => l.provider.toLowerCase() === key);
    const url = safePlatformUrl(key, drafts[key] ?? "");
    if (!url) { toast.error("Enter a valid HTTPS profile link for this platform."); return; }
    setBusy(key);
    try {
      const values = { url, enabled: enabled ?? existing?.enabled ?? true };
      const result = existing
        ? await supabase.from("user_social_links").update(values).eq("id", existing.id).eq("user_id", user.id).select().single()
        : await supabase.from("user_social_links").insert({ ...values, user_id: user.id, provider: key, sort_order: links.length }).select().single();
      if (result.error) throw result.error;
      const saved = result.data;
      setLinks(current => existing ? current.map(l => l.id === saved.id ? saved : l) : [...current, saved]);
      setDrafts(current => ({ ...current, [key]: saved.url }));
      await queryClient.invalidateQueries({ queryKey: ["artist-meta"] });
      toast.success(enabled === undefined ? "Platform link saved" : enabled ? "Platform visible on your profile" : "Platform hidden from your profile");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save the platform link."); }
    finally { setBusy(null); }
  }

  async function remove(key: string) {
    if (!user) return;
    const existing = links.find(l => l.provider.toLowerCase() === key);
    if (!existing) return;
    setBusy(key);
    try {
      const { error } = await supabase.from("user_social_links").delete().eq("id", existing.id).eq("user_id", user.id);
      if (error) throw error;
      setLinks(current => current.filter(l => l.id !== existing.id));
      setDrafts(current => ({ ...current, [key]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["artist-meta"] });
      toast.success("Platform link removed");
    } catch { toast.error("Could not remove the platform link."); }
    finally { setBusy(null); }
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return <SettingsShell title="Connected Platforms">
    {!user ? <p className="text-muted-foreground">Sign in to manage your platform links.</p> : error ? <p role="alert" className="text-destructive">{error}</p> : <div className="space-y-0 divide-y divide-border">
      {PROFILE_PLATFORMS.map(p => {
        const saved = links.find(l => l.provider.toLowerCase() === p.key);
        const url = safePlatformUrl(p.key, saved?.url ?? "");
        return <form key={p.key} aria-label={p.label + " platform"} onSubmit={e => { e.preventDefault(); void save(p.key); }} className="space-y-3 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold text-foreground">{p.label}</h2><p className="text-xs text-muted-foreground">{saved ? saved.enabled ? "Profile link · Visible" : "Profile link · Hidden" : "No profile link"}</p></div>
            {saved && <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Visible</span><Switch aria-label={"Show " + p.label + " on profile"} checked={saved.enabled} disabled={busy !== null} onCheckedChange={value => { void save(p.key, value); }} /></div>}
          </div>
          <label htmlFor={p.key + "-url"} className="sr-only">{p.label} profile URL</label>
          <Input id={p.key + "-url"} type="url" value={drafts[p.key] ?? ""} onChange={e => setDrafts(current => ({ ...current, [p.key]: e.target.value }))} placeholder={p.placeholder} required className="w-full" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy !== null}>{busy === p.key ? <Loader2 className="animate-spin" /> : <Save />}Save link</Button>
            {url && <Button variant="outline" size="sm" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink />Visit</a></Button>}
            {saved && <Button type="button" variant="ghost" size="sm" onClick={() => { void remove(p.key); }} disabled={busy !== null}><Trash2 />Remove</Button>}
          </div>
        </form>;
      })}
    </div>}
  </SettingsShell>;
}
