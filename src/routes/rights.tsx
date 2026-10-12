import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ShieldCheck, Loader2, AlertTriangle, DollarSign, Info, CheckCircle2, Clock, BookOpen, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { hasArtistTools } from "@/lib/artist-navigation";
import { RIGHTS_ORGS, STATUS_LABEL, canAddSplit, countRights, splitTotal, type OrgKey, type RightsStatus } from "@/lib/rights";
import shield from "@/assets/rights-shield.jpg";

export const Route = createFileRoute("/rights")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Music Rights & Royalties — Tunevio" },
      { name: "description", content: "Track your copyright, PRO, publishing and mechanical registrations and song splits in one place." },
      { property: "og:title", content: "Music Rights & Royalties — Tunevio" },
      { property: "og:description", content: "Track your copyright, PRO, publishing and mechanical registrations and song splits in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RightsPage,
});

const db = supabase as any;
const glass = "rounded-xl border border-primary/25 bg-card/70 backdrop-blur-md shadow-[0_0_24px_-12px_var(--primary)]";

function StatusPill({ s }: { s: RightsStatus | string }) {
  const tone = s === "verified" ? "border-emerald-400/40 text-emerald-300 bg-emerald-400/10"
    : s === "issue" || s === "open" ? "border-destructive/50 text-destructive bg-destructive/10"
    : s === "not_started" ? "border-border text-muted-foreground" : "border-primary/40 text-primary bg-primary/10";
  return <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs ${tone}`}>{(STATUS_LABEL as any)[s] ?? String(s).replace("_", " ")}</span>;
}

function RightsPage() {
  const auth = useAuth();
  if (auth.loading || auth.rolesLoading) return <div className="p-8 text-muted-foreground" role="status">Loading…</div>;
  if (!auth.user) return <div className="mx-auto max-w-xl p-10 text-foreground"><h1 className="text-2xl font-bold">Music Rights & Royalties</h1><Button asChild className="mt-4"><Link to="/login">Sign in</Link></Button></div>;
  if (!hasArtistTools(auth.roles)) return <div className="mx-auto max-w-xl p-10 text-foreground"><h1 className="text-2xl font-bold">Music Rights & Royalties</h1><p className="mt-2 text-muted-foreground">This tool is for artists.</p><Button asChild className="mt-4"><Link to="/signup" search={{ as: "artist" } as any}>Sign up as an artist</Link></Button></div>;
  return <ArtistDashboardShell><Dashboard userId={auth.user.id} /></ArtistDashboardShell>;
}

function Dashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["rights", userId],
    queryFn: async () => {
      const [regs, tracks, songs, splits, disputes, activity, statements] = await Promise.all([
        db.from("rights_registrations").select("*").eq("user_id", userId),
        db.from("play_tracks").select("id,title,artist_name,cover_url").eq("artist_user_id", userId).order("created_at", { ascending: false }).limit(200),
        db.from("song_rights").select("*").eq("user_id", userId),
        db.from("song_rights_splits").select("*").eq("user_id", userId),
        db.from("rights_disputes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        db.from("rights_activity").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
        db.from("royalty_statements").select("*").eq("user_id", userId),
      ]);
      const ids = (tracks.data ?? []).map((t: any) => t.id);
      const isrc = ids.length ? await db.from("distribution_release_tracks").select("published_track_id,isrc").in("published_track_id", ids) : { data: [] };
      return { regs: regs.data ?? [], tracks: tracks.data ?? [], songs: songs.data ?? [], splits: splits.data ?? [], disputes: disputes.data ?? [], activity: activity.data ?? [], statements: statements.data ?? [], isrc: Object.fromEntries((isrc.data ?? []).filter((r: any) => r.isrc).map((r: any) => [r.published_track_id, r.isrc])) };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["rights", userId] });
  const [orgOpen, setOrgOpen] = useState<OrgKey | null>(null);
  const [songOpen, setSongOpen] = useState<string | null>(null);
  const d = q.data;
  const regBy = useMemo(() => Object.fromEntries((d?.regs ?? []).map((r: any) => [r.organization, r])), [d]);
  const counts = countRights(d?.regs ?? [], (d?.disputes ?? []).filter((x: any) => x.status === "open" || x.status === "under_review").length);
  const reported = (d?.statements ?? []).reduce((s: number, x: any) => s + Number(x.amount_cents), 0);

  if (q.isLoading) return <div className="p-8 text-muted-foreground" role="status">Loading your rights…</div>;
  if (q.isError) return <div className="p-8 text-destructive">Couldn't load your rights data. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></div>;

  const stats = [
    { icon: FileText, label: "Registrations", value: counts.total, sub: "Total submissions" },
    { icon: ShieldCheck, label: "Verified", value: counts.verified, sub: "Registrations verified" },
    { icon: Loader2, label: "In Progress", value: counts.inProgress, sub: "Awaiting verification" },
    { icon: AlertTriangle, label: "Issues", value: counts.issues, sub: "Require attention" },
    { icon: DollarSign, label: "Reported Earnings", value: reported ? `$${(reported / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—", sub: reported ? "From your statements" : "No earnings reported yet" },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl">
        <img src={shield} alt="" aria-hidden className="pointer-events-none absolute right-0 top-1/2 hidden h-[160%] -translate-y-1/2 object-contain opacity-80 sm:block" />
        <div className="relative max-w-xl py-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Music Rights & Royalties</h1>
          <p className="mt-2 text-muted-foreground">Manage your rights, registrations and royalties all in one place.</p>
          <a href="#resources" className="mt-3 inline-block text-sm text-primary">▸ Learn more about music rights</a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className={`${glass} flex gap-3 p-4`}>
            <Icon className="h-9 w-9 shrink-0 text-primary" />
            <div className="min-w-0"><div className="text-sm">{label}</div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{sub}</div></div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <section className={`${glass} min-w-0 p-4`}>
          <h2 className="text-lg font-semibold">Rights Organizations</h2>
          <p className="text-sm text-muted-foreground">Connect, manage and track your registrations.</p>
          <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 2xl:grid-cols-6">
            {RIGHTS_ORGS.map((o) => {
              const r = regBy[o.key];
              const st: RightsStatus = r?.status ?? "not_started";
              return (
                <div key={o.key} className="flex w-44 shrink-0 snap-start flex-col items-center gap-2 rounded-lg border border-primary/20 bg-background/60 p-4 text-center lg:w-auto">
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-primary/40 text-xs font-black text-primary">{o.name.replace("U.S. ", "").split(" ").map((w) => w[0]).join("").slice(0, 3)}</div>
                  <div className="text-sm font-semibold leading-tight">{o.name}</div>
                  <div className="text-xs text-muted-foreground">{o.role}</div>
                  <StatusPill s={st} />
                  <div className="min-h-4 text-[11px] text-muted-foreground">{r?.member_id ? `${o.idLabel}: ${r.member_id}` : r?.applied_at ? `App. date: ${new Date(r.applied_at).toLocaleDateString()}` : ""}</div>
                  <Button size="sm" variant="outline" className="mt-auto w-full border-primary/50" onClick={() => setOrgOpen(o.key)}>{st === "not_started" ? "Start" : st === "verified" || st === "submitted" ? "View Details" : "Continue"}</Button>
                </div>
              );
            })}
          </div>
        </section>

        <aside className={`${glass} p-4`}>
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {!d!.activity.length ? <p className="mt-3 text-sm text-muted-foreground">No activity yet. Start a registration to see updates here.</p> : (
            <ul className="mt-3 space-y-3">{d!.activity.map((a: any) => (
              <li key={a.id} className="flex gap-3 text-sm">{a.kind === "verified" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : a.kind === "issue" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-primary" />}
                <div><div>{a.summary}</div><div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div></div></li>
            ))}</ul>
          )}
        </aside>
      </div>

      <div className={`${glass} flex flex-col gap-3 border-primary/50 p-4 sm:flex-row sm:items-center`}>
        <Info className="h-6 w-6 shrink-0 text-primary" />
        <div className="flex-1 text-sm"><div className="font-semibold">Tunevio does not register your work or collect royalties on your behalf.</div><div className="text-muted-foreground">We provide tools and resources to help you manage your rights. You must complete registration on the official websites.</div></div>
        <Button variant="outline" asChild><a href="#resources">Learn More</a></Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <section className={`${glass} min-w-0 p-4`}>
          <h2 className="text-lg font-semibold">My Song Catalog</h2>
          <p className="text-sm text-muted-foreground">Manage your songs and rights information.</p>
          {!d!.tracks.length ? <p className="mt-4 text-sm text-muted-foreground">No songs yet. <Link to="/settings/music-media" className="text-primary">Upload your music</Link> to manage its rights.</p> : (
            <div className="mt-4 divide-y divide-border">
              <div className="hidden grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-3 pb-2 text-xs uppercase text-muted-foreground md:grid"><span>Song</span><span>Writers</span><span>ISWC</span><span>ISRC</span><span>Ownership</span><span>Rights status</span></div>
              {d!.tracks.map((t: any) => {
                const sr = d!.songs.find((s: any) => s.track_id === t.id);
                const sp = sr ? d!.splits.filter((x: any) => x.song_rights_id === sr.id) : [];
                const dispute = sr && d!.disputes.some((x: any) => x.song_rights_id === sr.id && (x.status === "open" || x.status === "under_review"));
                return (
                  <button key={t.id} onClick={() => setSongOpen(t.id)} className="grid w-full grid-cols-2 gap-2 py-3 text-left text-sm hover:bg-muted/30 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] md:gap-3">
                    <span className="col-span-2 flex items-center gap-3 md:col-span-1">{t.cover_url ? <SignedImg src={t.cover_url} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="h-10 w-10 rounded bg-muted" />}<span><span className="block font-medium">{t.title}</span><span className="text-xs text-muted-foreground">{t.artist_name}</span></span></span>
                    <span className="text-muted-foreground">{sp.filter((x: any) => x.role !== "publisher").map((x: any) => x.name).join(", ") || "—"}</span>
                    <span>{sr?.iswc || "—"}</span>
                    <span>{sr?.isrc || d!.isrc[t.id] || "—"}</span>
                    <span>{sp.length ? `${splitTotal(sp)}%` : "—"}</span>
                    <span><StatusPill s={dispute ? "issue" : sr?.status ?? "not_started"} /></span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
        <aside id="resources" className={`${glass} p-4`}>
          <h2 className="text-lg font-semibold">Helpful Resources</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {[["Music Rights 101", "Learn the basics", "https://www.copyright.gov/music-modernization/"],["Understanding Royalties", "Performance, mechanical and neighbouring rights", "https://www.themlc.com/how-it-works"],["Which organizations do what", "PROs vs. SoundExchange vs. The MLC", "https://www.soundexchange.com/about/"]].map(([t, s, u]) => (
              <li key={t}><a href={u} target="_blank" rel="noreferrer" className="flex gap-3 hover:text-primary"><BookOpen className="h-4 w-4 text-primary" /><span><span className="block">{t}</span><span className="text-xs text-muted-foreground">{s}</span></span></a></li>
            ))}
          </ul>
        </aside>
      </div>

      {orgOpen && <OrgDialog org={orgOpen} reg={regBy[orgOpen]} userId={userId} onClose={() => setOrgOpen(null)} onSaved={refresh} />}
      {songOpen && <SongDialog track={d!.tracks.find((t: any) => t.id === songOpen)} song={d!.songs.find((s: any) => s.track_id === songOpen)} splits={d!.splits} isrc={d!.isrc[songOpen]} userId={userId} onClose={() => setSongOpen(null)} onSaved={refresh} />}
    </div>
  );
}

function OrgDialog({ org, reg, userId, onClose, onSaved }: { org: OrgKey; reg: any; userId: string; onClose: () => void; onSaved: () => void }) {
  const o = RIGHTS_ORGS.find((x) => x.key === org)!;
  const [checklist, setChecklist] = useState<Record<string, boolean>>(reg?.checklist ?? {});
  const [memberId, setMemberId] = useState(reg?.member_id ?? "");
  const [appliedAt, setAppliedAt] = useState(reg?.applied_at ?? "");
  const [status, setStatus] = useState<RightsStatus>(reg?.status ?? "not_started");
  const [busy, setBusy] = useState(false);
  const verified = reg?.status === "verified";
  const save = async () => {
    setBusy(true);
    const nextStatus = verified ? "verified" : status === "not_started" && Object.values(checklist).some(Boolean) ? "in_progress" : status;
    const { error } = await db.from("rights_registrations").upsert({ user_id: userId, organization: org, checklist, member_id: memberId || null, applied_at: appliedAt || null, status: nextStatus }, { onConflict: "user_id,organization" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved(); onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{o.name} — {o.role}</DialogTitle></DialogHeader>
        <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary">Open official website <ExternalLink className="h-3 w-3" /></a>
        <div className="space-y-2">{o.steps.map((s, i) => (
          <label key={i} className="flex items-center gap-3 text-sm"><Checkbox checked={!!checklist[i]} onCheckedChange={(v) => setChecklist((c) => ({ ...c, [i]: !!v }))} />{s}</label>
        ))}</div>
        <label className="text-sm">{o.idLabel}<Input value={memberId} maxLength={80} onChange={(e) => setMemberId(e.target.value)} /></label>
        <label className="text-sm">Application date<Input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} /></label>
        {verified ? <p className="text-sm text-emerald-300">Verified by Tunevio.{reg?.admin_note ? ` ${reg.admin_note}` : ""}</p> : (
          <div className="flex flex-wrap gap-2">{(["in_progress", "submitted", "issue"] as RightsStatus[]).map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</Button>
          ))}</div>
        )}
        {reg?.admin_note && !verified && <p className="text-sm text-muted-foreground">Tunevio note: {reg.admin_note}</p>}
        <p className="text-xs text-muted-foreground">Only Tunevio admins can mark a registration Verified after checking your proof.</p>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save progress"}</Button>
      </DialogContent>
    </Dialog>
  );
}

function SongDialog({ track, song, splits, isrc, userId, onClose, onSaved }: any) {
  const [iswc, setIswc] = useState(song?.iswc ?? "");
  const [isrcV, setIsrcV] = useState(song?.isrc ?? isrc ?? "");
  const [publisher, setPublisher] = useState(song?.publisher ?? "");
  const [refs, setRefs] = useState<Record<string, string>>(song?.registration_refs ?? {});
  const [split, setSplit] = useState({ name: "", role: "writer", ipi: "", pct: "" });
  const [dispute, setDispute] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = song ? splits.filter((x: any) => x.song_rights_id === song.id) : [];
  const ensure = async () => {
    if (song) return song.id;
    const { data, error } = await db.from("song_rights").insert({ user_id: userId, track_id: track.id, status: "in_progress" }).select("id").single();
    if (error) throw error; return data.id;
  };
  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try { await fn(); toast.success(msg); onSaved(); } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { setBusy(false); }
  };
  const saveInfo = () => run(async () => {
    const id = await ensure();
    const { error } = await db.from("song_rights").update({ iswc: iswc || null, isrc: isrcV || null, publisher: publisher || null, registration_refs: refs }).eq("id", id);
    if (error) throw error;
  }, "Song rights saved");
  const addSplit = () => run(async () => {
    const pct = Number(split.pct);
    if (!split.name.trim() || !canAddSplit(mine, pct)) throw new Error("Splits must be above 0 and total 100% or less");
    const id = await ensure();
    const { error } = await db.from("song_rights_splits").insert({ song_rights_id: id, user_id: userId, name: split.name.trim(), role: split.role, ipi: split.ipi || null, share_pct: pct });
    if (error) throw error;
    setSplit({ name: "", role: "writer", ipi: "", pct: "" });
  }, "Credit added");
  const delSplit = (id: string) => run(async () => { const { error } = await db.from("song_rights_splits").delete().eq("id", id); if (error) throw error; }, "Credit removed");
  const openDispute = () => run(async () => {
    if (dispute.trim().length < 3) throw new Error("Describe the dispute");
    const id = await ensure();
    const { error } = await db.from("rights_disputes").insert({ user_id: userId, song_rights_id: id, description: dispute.trim() });
    if (error) throw error; setDispute("");
  }, "Dispute opened");
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{track.title} — rights</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">ISWC<Input value={iswc} maxLength={20} placeholder="T-123.456.789-0" onChange={(e) => setIswc(e.target.value)} /></label>
          <label className="text-sm">ISRC<Input value={isrcV} maxLength={15} onChange={(e) => setIsrcV(e.target.value)} /></label>
          <label className="col-span-2 text-sm">Publisher<Input value={publisher} maxLength={120} onChange={(e) => setPublisher(e.target.value)} /></label>
          {RIGHTS_ORGS.map((o) => <label key={o.key} className="text-xs">{o.name} ref<Input value={refs[o.key] ?? ""} maxLength={60} onChange={(e) => setRefs((r) => ({ ...r, [o.key]: e.target.value }))} /></label>)}
        </div>
        <Button onClick={saveInfo} disabled={busy}>Save song info</Button>
        <h3 className="mt-2 font-semibold">Credits & ownership splits ({splitTotal(mine)}%)</h3>
        {mine.map((x: any) => <div key={x.id} className="flex items-center justify-between text-sm"><span>{x.name} · {x.role}{x.ipi ? ` · IPI ${x.ipi}` : ""}</span><span className="flex items-center gap-2">{Number(x.share_pct)}%<Button size="icon" variant="ghost" aria-label="Remove credit" onClick={() => delSplit(x.id)}><Trash2 className="h-4 w-4" /></Button></span></div>)}
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Name" value={split.name} onChange={(e) => setSplit({ ...split, name: e.target.value })} />
          <select className="rounded-md border border-input bg-background px-2 text-sm" value={split.role} onChange={(e) => setSplit({ ...split, role: e.target.value })}>{["writer", "composer", "publisher", "producer"].map((r) => <option key={r}>{r}</option>)}</select>
          <Input placeholder="IPI (optional)" value={split.ipi} onChange={(e) => setSplit({ ...split, ipi: e.target.value })} />
          <Input placeholder="Share %" type="number" min={0} max={100} value={split.pct} onChange={(e) => setSplit({ ...split, pct: e.target.value })} />
        </div>
        <Button variant="outline" onClick={addSplit} disabled={busy}><Plus className="h-4 w-4" /> Add credit</Button>
        <h3 className="mt-2 font-semibold">Report a rights dispute</h3>
        <Textarea value={dispute} maxLength={2000} placeholder="e.g. Someone else claimed this song on a platform" onChange={(e) => setDispute(e.target.value)} />
        <Button variant="outline" onClick={openDispute} disabled={busy}>Open dispute</Button>
      </DialogContent>
    </Dialog>
  );
}
