import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Loader2, Nfc, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { listMyPages, createPage } from "@/lib/nfc-pages.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/artist-store/pages/")({
  head: () => ({
    meta: [
      { title: "Your NFC Pages — Tunevio" },
      { name: "description", content: "Build the music, video and product pages fans open when they tap your Tunevio NFC tags." },
      { property: "og:title", content: "Your NFC Pages — Tunevio" },
      { property: "og:description", content: "Build the pages fans open when they tap your Tunevio NFC tags." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PagesList,
});

function PagesList() {
  const { user, loading } = useAuth() as any;
  const navigate = useNavigate();
  const fetchPages = useServerFn(listMyPages);
  const create = useServerFn(createPage);
  const q = useQuery({ queryKey: ["nfc-pages"], queryFn: () => fetchPages(), enabled: !!user });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "name">("date");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const pages = useMemo(() => {
    const list = (q.data?.pages ?? []).filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));
    return sort === "name" ? [...list].sort((a: any, b: any) => a.name.localeCompare(b.name)) : list;
  }, [q.data, search, sort]);

  async function submit() {
    if (!name.trim()) return toast.error("Name your page");
    setBusy(true);
    try { const r = await create({ data: { name } }); navigate({ to: "/artist-store/pages/$pageId", params: { pageId: r.id } }); }
    catch (e: any) { toast.error(e.message); setBusy(false); }
  }

  if (!loading && !user) return <main className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-xl font-bold">Sign in to build NFC pages</h1><Link to="/login" className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Sign in</Link></main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><Nfc className="h-4 w-4" /> NFC experiences</p>
          <h1 className="mt-1 text-3xl font-bold uppercase tracking-wider sm:text-4xl">Your pages</h1>
        </div>
        <Link to="/artist-store/tags" className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"><ShoppingCart className="h-4 w-4" /> Order NFC tags</Link>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase">
          Sort by:
          {(["date", "name"] as const).map((s) => <button key={s} onClick={() => setSort(s)} className={`rounded-md px-3 py-1.5 ${sort === s ? "bg-foreground text-background" : "text-muted-foreground"}`}>{s === "date" ? "Creation date" : "Name"}</button>)}
        </div>
        <label className="flex items-center gap-2 border border-border px-3 sm:w-72"><Search className="h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search pages" className="h-10 w-full bg-transparent text-sm outline-none" /></label>
      </div>

      {q.isLoading ? <div className="grid h-60 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="flex aspect-[9/16] flex-col items-center justify-center gap-4 rounded-2xl bg-foreground p-4 text-background shadow-[0_0_40px_hsl(var(--primary)/0.25)]">
            {naming ? (
              <div className="w-full space-y-3">
                <p className="text-sm font-bold uppercase">Name your page</p>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} maxLength={80} placeholder="Name" className="w-full border border-background/40 bg-transparent px-3 py-2 text-sm outline-none" />
                <button disabled={busy} onClick={submit} className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Creating…" : "Create"}</button>
                <button onClick={() => setNaming(false)} className="w-full text-xs opacity-70">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setNaming(true)} className="flex flex-col items-center gap-4"><span className="text-sm font-bold uppercase tracking-wider">New page</span><span className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-background"><Plus className="h-5 w-5" /></span></button>
            )}
          </div>
          {pages.map((p: any) => (
            <Link key={p.id} to="/artist-store/pages/$pageId" params={{ pageId: p.id }} className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary">
              <div className="grid aspect-[9/13] place-items-center bg-background text-xs font-bold uppercase tracking-widest text-muted-foreground">{p.tabs?.length ? `${p.tabs.length} tab${p.tabs.length > 1 ? "s" : ""}` : "No preview"}</div>
              <div className="p-3 text-center">
                <div className="truncate font-bold">{p.name}</div>
                <div className={`mt-1 text-[10px] font-semibold uppercase ${p.status === "published" ? "text-primary" : "text-muted-foreground"}`}>{p.status === "published" ? "Live" : "Draft"}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
