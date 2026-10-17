import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, List, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionPage } from "@/components/admin/SectionPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { adminSaveNavItems, getSiteNav, type NavRow } from "@/lib/site-nav.functions";

export const Route = createFileRoute("/admin/navigation")({
  head: () => ({ meta: [{ title: "Navigation Bar — Admin" }, { name: "robots", content: "noindex" }] }),
  component: NavigationEditor,
});

const SLOTS: { key: "primary" | "browse"; title: string; hint: string }[] = [
  { key: "primary", title: "Main navigation", hint: "The links shown across the top of every page." },
  { key: "browse", title: "Browse menu", hint: "Links inside the Browse dropdown and the mobile menu." },
];

const ICON_CHOICES = ["Home", "Compass", "Radio", "Music", "User", "LayoutDashboard", "ShoppingCart", "Disc3", "Trophy", "BarChart3", "Calendar", "Newspaper", "Mail", "Mic", "Film"];

const DESTINATIONS = ["/", "/discover", "/live", "/artists", "/profile", "/artist-dashboard", "/store", "/artist-store", "/play", "/leaderboard", "/videos", "/charts", "/events", "/blog", "/contact", "/off-the-block", "/pricing", "/help"];

function NavigationEditor() {
  const auth = useAuth();
  const qc = useQueryClient();
  const load = useServerFn(getSiteNav);
  const save = useServerFn(adminSaveNavItems);
  const q = useQuery({ queryKey: ["site-nav"], queryFn: () => load(), enabled: auth.roles.includes("admin") });
  const [items, setItems] = useState<NavRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = items ?? q.data?.items ?? [];

  const update = (id: string, patch: Partial<NavRow>) =>
    setItems((prev) => (prev ?? [...(q.data?.items ?? [])]).map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const move = (slot: string, id: string, dir: -1 | 1) =>
    setItems((prev) => {
      const list = [...(prev ?? [...(q.data?.items ?? [])])];
      const idxs = list.map((r, i) => (r.slot === slot ? i : -1)).filter((i) => i >= 0);
      const pos = idxs.findIndex((i) => list[i].id === id);
      const swap = idxs[pos + dir];
      if (swap === undefined) return list;
      [list[idxs[pos]].position, list[swap].position] = [list[swap].position, list[idxs[pos]].position];
      return list;
    });

  const add = (slot: "primary" | "browse") =>
    setItems((prev) => {
      const list = [...(prev ?? [...(q.data?.items ?? [])])];
      const maxPos = Math.max(0, ...list.filter((r) => r.slot === slot).map((r) => r.position));
      list.push({
        id: crypto.randomUUID(),
        slot,
        to_path: "/",
        label: "New link",
        icon: "Music",
        position: maxPos + 1,
        visible: true,
      });
      return list;
    });

  const remove = (id: string) => setItems((prev) => (prev ?? [...(q.data?.items ?? [])]).filter((r) => r.id !== id));

  const persist = async () => {
    setSaving(true);
    try {
      await save({ data: { items: rows } });
      toast.success("Navigation saved and applied site-wide");
      setItems(null);
      qc.invalidateQueries({ queryKey: ["site-nav"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save the navigation");
    } finally {
      setSaving(false);
    }
  };

  const dirty = items !== null;

  return (
    <SectionPage
      title="Navigation Bar"
      subtitle="Rename, reorder, hide or add the links in your site navigation. Changes apply across the whole site after saving."
      stats={[{ label: "Links", value: String(rows.length), icon: List, color: "#00E6FF" }]}
    >
      <div className="mb-4 flex justify-end">
        <Button onClick={persist} disabled={saving || !dirty}>
          <Save className="size-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
        </Button>
      </div>
      <div className="space-y-6">
        {SLOTS.map((s) => {
          const list = rows.filter((r) => r.slot === s.key).sort((a, b) => a.position - b.position);
          return (
            <div key={s.key} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{s.title}</h2>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => add(s.key)}>
                  <Plus className="size-4" /> Add link
                </Button>
              </div>
              {list.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
              <div className="space-y-2">
                {list.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2 text-sm">
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => move(s.key, r.id, -1)}><ArrowUp className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => move(s.key, r.id, 1)}><ArrowDown className="size-4" /></Button>
                    </div>
                    <input
                      value={r.label}
                      onChange={(e) => update(r.id, { label: e.target.value })}
                      placeholder="Label"
                      className="h-9 w-36 rounded-md border border-border bg-background px-2"
                      aria-label="Link label"
                    />
                    <input
                      value={r.to_path}
                      onChange={(e) => update(r.id, { to_path: e.target.value })}
                      placeholder="/destination"
                      list="nav-destinations"
                      className="h-9 w-40 rounded-md border border-border bg-background px-2"
                      aria-label="Link destination"
                    />
                    <select
                      value={r.icon}
                      onChange={(e) => update(r.id, { icon: e.target.value })}
                      className="h-9 rounded-md border border-border bg-background px-2"
                      aria-label="Icon"
                    >
                      {ICON_CHOICES.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => update(r.id, { visible: !r.visible })}>
                      {r.visible ? <><Eye className="size-4" /> Visible</> : <><EyeOff className="size-4" /> Hidden</>}
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete link" onClick={() => remove(r.id)} className="text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <datalist id="nav-destinations">
          {DESTINATIONS.map((d) => <option key={d} value={d} />)}
        </datalist>
        <p className="text-xs text-muted-foreground">
          "My Profile" and "Artist Dashboard" keep their smart behavior for signed-in members even when you rename or reorder them.
        </p>
      </div>
    </SectionPage>
  );
}
