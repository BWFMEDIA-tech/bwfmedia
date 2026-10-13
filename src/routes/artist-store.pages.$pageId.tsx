import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Disc3, Film, ImagePlus, Loader2, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getMyPage, savePage, deletePage } from "@/lib/nfc-pages.functions";
import { TAB_LABELS, TAB_TYPES, moveTab, newTab, uniqueIds, type PageTab, type TabType } from "@/lib/nfc-pages";
import { NfcPagePreview, type PreviewTab } from "@/components/store/NfcPagePreview";

export const Route = createFileRoute("/artist-store/pages/$pageId")({
  head: () => ({
    meta: [
      { title: "Page Builder — Tunevio NFC" },
      { name: "description", content: "Build the page fans open when they tap your Tunevio NFC tag." },
      { property: "og:title", content: "Page Builder — Tunevio NFC" },
      { property: "og:description", content: "Build the page fans open when they tap your Tunevio NFC tag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Builder,
});

const ICONS: Record<TabType, any> = { music: Disc3, video: Film, product: Package };
const field = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Builder() {
  const { pageId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchPage = useServerFn(getMyPage);
  const save = useServerFn(savePage);
  const del = useServerFn(deletePage);
  const q = useQuery({ queryKey: ["nfc-page", pageId], queryFn: () => fetchPage({ data: { id: pageId } }), enabled: !!user });
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [tabs, setTabs] = useState<PageTab[]>([]);
  const [active, setActive] = useState(-1);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    const p: any = q.data?.page;
    if (!p) return;
    setName(p.name); setStatus(p.status); setTabs(p.tabs ?? []); setActive((p.tabs ?? []).length ? 0 : -1);
    const paths = (p.tabs ?? []).flatMap((t: PageTab) => [t.cover, ...(t.images ?? [])]).filter(Boolean);
    if (paths.length) supabase.storage.from("store-products").createSignedUrls(paths, 3600).then(({ data }) => {
      const m: Record<string, string> = {};
      for (const d of data ?? []) if (d.path && d.signedUrl) m[d.path] = d.signedUrl;
      setUrls(m);
    });
  }, [q.data]);

  if (q.isLoading || !user) return <div className="grid h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!q.data?.page) return <main className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-xl font-bold">Page not found</h1><Link to="/artist-store/pages" className="mt-4 inline-block text-sm text-primary">Back to your pages</Link></main>;
  const { tracks, videos } = q.data;
  const page: any = q.data.page;
  const tab = tabs[active];
  const tapUrl = `${typeof window !== "undefined" ? window.location.origin : "https://tunevio.com"}/p/${page.code}`;

  function update(patch: Partial<PageTab>) { setTabs((ts) => ts.map((t, i) => (i === active ? { ...t, ...patch } : t))); }
  function add(type: TabType) { setTabs((ts) => [...ts, newTab(type)]); setActive(tabs.length); }

  async function upload(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { toast.error("Use an image under 8 MB"); return null; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const p = `${user!.id}/pages/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("store-products").upload(p, file, { contentType: file.type });
    if (error) { toast.error("Upload failed"); return null; }
    setUrls((u) => ({ ...u, [p]: URL.createObjectURL(file) }));
    return p;
  }

  async function onSave(nextStatus = status) {
    setSaving(true);
    try { await save({ data: { id: pageId, name, status: nextStatus, tabs } }); setStatus(nextStatus); toast.success(nextStatus === "published" ? "Page is live" : "Saved"); q.refetch(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const preview: PreviewTab[] = tabs.map((t) => ({
    ...t,
    coverUrl: t.cover ? urls[t.cover] ?? null : null,
    imageUrls: (t.images ?? []).map((p) => urls[p]).filter(Boolean),
    tracks: (t.trackIds ?? []).map((id) => tracks.find((x: any) => x.id === id)).filter(Boolean) as any[],
    video: t.videoId ? videos.find((v: any) => v.id === t.videoId) ?? null : null,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/artist-store/pages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Your pages</Link>
        <div className="flex gap-2">
          <button disabled={saving} onClick={() => onSave()} className="border border-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50">Save</button>
          <button disabled={saving} onClick={() => onSave(status === "published" ? "draft" : "published")} className="bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50">{status === "published" ? "Unpublish" : "Publish"}</button>
        </div>
      </div>
      <h1 className="mt-4 text-3xl font-bold uppercase tracking-wider">Page builder</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="order-2 lg:order-1">
          <NfcPagePreview name={name} tabs={preview} />
          <div className="mt-3 flex items-center gap-2 border border-border p-2 text-xs">
            <code className="min-w-0 flex-1 truncate">{tapUrl}</code>
            <button aria-label="Copy tap link" onClick={() => { navigator.clipboard.writeText(tapUrl); toast.success("Copied"); }}><Copy className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{status === "published" ? "Live: fans who open this link see the page." : "Draft: publish so the link works for fans."} To use it on a tag, choose “Another Tunevio page” in your NFC product and paste <span className="text-foreground">/p/{page.code}</span>.</p>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <label className="text-sm font-bold uppercase tracking-wider">Page name:</label>
          <input className={`${field} mt-2`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />

          {tabs.length > 0 && (
            <div className="mt-6 flex items-end gap-1 overflow-x-auto">
              {tabs.map((t, i) => (
                <button key={t.id} onClick={() => setActive(i)} className={`shrink-0 border border-b-0 px-5 py-2.5 text-xs font-semibold uppercase ${i === active ? "border-foreground bg-background" : "border-border text-muted-foreground"}`}>{t.title || TAB_LABELS[t.type]}</button>
              ))}
              <button aria-label="Add tab" onClick={() => setActive(-1)} className={`grid h-10 w-10 shrink-0 place-items-center ${active === -1 ? "bg-primary text-primary-foreground" : "bg-foreground text-background"}`}><Plus className="h-5 w-5" /></button>
            </div>
          )}

          <div className="border border-foreground/60">
            {active === -1 || !tab ? (
              <div className="p-5">
                <h2 className="text-lg font-bold uppercase tracking-wider">Select a tab</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {TAB_TYPES.map((t) => { const I = ICONS[t]; return <button key={t} onClick={() => add(t)} className="flex items-center justify-center gap-3 bg-foreground px-4 py-4 text-xs font-semibold uppercase tracking-widest text-background hover:bg-primary hover:text-primary-foreground"><I className="h-5 w-5" /> {TAB_LABELS[t]} tab</button>; })}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-foreground/60 px-5 py-3">
                  <span className="text-sm font-bold uppercase">Tab settings</span>
                  <div className="flex gap-3 text-muted-foreground">
                    <button aria-label="Rename tab" onClick={() => setRenaming((r) => !r)}><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Move left" onClick={() => { setTabs((ts) => moveTab(ts, active, -1)); setActive((a) => Math.max(0, a - 1)); }}><ArrowLeft className="h-4 w-4" /></button>
                    <button aria-label="Move right" onClick={() => { setTabs((ts) => moveTab(ts, active, 1)); setActive((a) => Math.min(tabs.length - 1, a + 1)); }}><ArrowRight className="h-4 w-4" /></button>
                    <button aria-label="Delete tab" onClick={() => { setTabs((ts) => ts.filter((_, i) => i !== active)); setActive(tabs.length > 1 ? 0 : -1); }}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {renaming && <div className="border-b border-border px-5 py-3"><input autoFocus className={field} value={tab.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} aria-label="Tab name" /></div>}
                <div className="space-y-4 p-5">
                  {tab.type === "music" && <MusicEditor tab={tab} update={update} upload={upload} urls={urls} tracks={tracks} />}
                  {tab.type === "video" && <VideoEditor tab={tab} update={update} videos={videos} />}
                  {tab.type === "product" && <ProductEditor tab={tab} update={update} upload={upload} urls={urls} />}
                </div>
              </>
            )}
          </div>
          <button onClick={async () => { if (!confirm("Delete this page?")) return; await del({ data: { id: pageId } }); navigate({ to: "/artist-store/pages" }); }} className="mt-6 text-xs text-destructive">Delete page</button>
        </div>
      </div>
    </main>
  );
}

type EdProps = { tab: PageTab; update: (p: Partial<PageTab>) => void };

function CoverPicker({ path, urls, upload, onChange, label }: { path?: string; urls: Record<string, string>; upload: (f: File) => Promise<string | null>; onChange: (p: string) => void; label: string }) {
  return (
    <label className="relative grid aspect-square w-full max-w-[220px] cursor-pointer place-items-center overflow-hidden bg-gradient-to-br from-muted via-secondary to-muted text-center">
      {path && urls[path] ? <img src={urls[path]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="text-sm font-bold uppercase">{label}</span>}
      <span className="absolute bottom-3 flex items-center gap-1 border border-foreground bg-background px-2 py-1 text-[10px] font-semibold uppercase"><ImagePlus className="h-3 w-3" /> Upload image</span>
      <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const p = await upload(f); if (p) onChange(p); } }} />
    </label>
  );
}

function MusicEditor({ tab, update, upload, urls, tracks }: EdProps & { upload: any; urls: Record<string, string>; tracks: any[] }) {
  const ids = tab.trackIds ?? [];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <CoverPicker path={tab.cover} urls={urls} upload={upload} onChange={(p) => update({ cover: p })} label="Album cover" />
        <div className="space-y-3">
          <input className={field} placeholder="TITLE" value={tab.subtitle ?? ""} maxLength={160} onChange={(e) => update({ subtitle: e.target.value })} />
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <input className={field} placeholder="ARTIST" value={tab.artist ?? ""} maxLength={120} onChange={(e) => update({ artist: e.target.value })} />
            <input className={field} type="date" value={tab.date ?? ""} onChange={(e) => update({ date: e.target.value })} aria-label="Release date" />
          </div>
          <textarea className={`${field} min-h-24`} placeholder="DESCRIPTION" value={tab.description ?? ""} maxLength={4000} onChange={(e) => update({ description: e.target.value })} />
        </div>
      </div>
      <div className="border border-dashed border-border p-4">
        <p className="text-sm font-bold uppercase">Songs</p>
        {tracks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">You don't have songs on Tunevio yet. <Link to="/upload" className="text-primary">Upload a song</Link>, then add it here.</p>
        ) : (
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {tracks.map((t) => { const on = ids.includes(t.id); return (
              <label key={t.id} className={`flex cursor-pointer items-center gap-3 border px-3 py-2 text-sm ${on ? "border-primary" : "border-border"}`}>
                <input type="checkbox" checked={on} onChange={() => update({ trackIds: on ? ids.filter((x) => x !== t.id) : uniqueIds([...ids, t.id]) })} />
                <span className="truncate">{t.title}</span>
              </label>
            ); })}
          </div>
        )}
        {ids.length > 1 && (
          <div className="mt-4 border border-border p-3">
            <p className="text-xs font-bold uppercase tracking-wider">Song order</p>
            <p className="mt-1 text-xs text-muted-foreground">Fans hear them in this order. Use the arrows to move a song up or down.</p>
            <ul className="mt-2 space-y-1">
              {ids.map((id, idx) => { const t = tracks.find((x: any) => x.id === id); if (!t) return null; return (
                <li key={id} className="flex items-center gap-2 border border-border px-3 py-2 text-sm">
                  <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{idx + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <button
                    type="button"
                    aria-label={`Move ${t.title} up`}
                    disabled={idx === 0}
                    onClick={() => update({ trackIds: moveId(ids, idx, -1) })}
                    className="grid h-7 w-7 place-items-center border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
                  ><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button
                    type="button"
                    aria-label={`Move ${t.title} down`}
                    disabled={idx === ids.length - 1}
                    onClick={() => update({ trackIds: moveId(ids, idx, 1) })}
                    className="grid h-7 w-7 place-items-center border border-border text-muted-foreground hover:text-foreground disabled:opacity-30"
                  ><ArrowDown className="h-3.5 w-3.5" /></button>
                </li>
              ); })}
            </ul>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Only songs already on Tunevio. Each song can be added once. <Link to="/upload" className="text-primary">Upload a new song</Link></p>
      </div>
    </>
  );
}

/** Moves an id one step up (-1) or down (+1) in the ordered list. */
function moveId(ids: string[], index: number, dir: -1 | 1): string[] {
  const to = index + dir;
  if (index < 0 || index >= ids.length || to < 0 || to >= ids.length) return ids;
  const next = ids.slice();
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

function VideoEditor({ tab, update, videos }: EdProps & { videos: any[] }) {
  return (
    <>
      <input className={field} placeholder="TITLE" value={tab.subtitle ?? ""} maxLength={160} onChange={(e) => update({ subtitle: e.target.value })} />
      <div className="border border-dashed border-border p-4">
        <p className="text-sm font-bold uppercase">Video</p>
        {videos.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No videos on Tunevio yet. <Link to="/upload" className="text-primary">Upload a video</Link>, then pick it here.</p> : (
          <select className={`${field} mt-3`} value={tab.videoId ?? ""} onChange={(e) => update({ videoId: e.target.value || undefined })}>
            <option value="">Choose a video</option>
            {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        )}
      </div>
    </>
  );
}

function ProductEditor({ tab, update, upload, urls }: EdProps & { upload: any; urls: Record<string, string> }) {
  const imgs = tab.images ?? [];
  return (
    <>
      <p className="text-sm text-muted-foreground">Tell fans about the physical product itself. Add images and a detailed description.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="TITLE" value={tab.subtitle ?? ""} maxLength={160} onChange={(e) => update({ subtitle: e.target.value })} />
        <input className={field} placeholder="SUB-TITLE" value={tab.artist ?? ""} maxLength={120} onChange={(e) => update({ artist: e.target.value })} />
      </div>
      <textarea className={`${field} min-h-32`} placeholder="DESCRIPTION" value={tab.description ?? ""} maxLength={4000} onChange={(e) => update({ description: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        {imgs.map((p) => (
          <div key={p} className="relative h-20 w-20 overflow-hidden border border-border">
            {urls[p] && <img src={urls[p]} alt="" className="h-full w-full object-cover" />}
            <button aria-label="Remove image" onClick={() => update({ images: imgs.filter((x) => x !== p) })} className="absolute right-0 top-0 bg-background/80 p-0.5"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {imgs.length < 8 && (
          <label className="grid h-20 w-20 cursor-pointer place-items-center border border-dashed border-border text-muted-foreground"><ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const p = await upload(f); if (p) update({ images: [...imgs, p] }); } }} />
          </label>
        )}
      </div>
    </>
  );
}
