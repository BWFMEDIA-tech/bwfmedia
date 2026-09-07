import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Disc3, Plus, Upload, Trash2, Send, ChevronDown, ChevronUp, Music2, X,
  Search, Pencil, ArrowUp, ArrowDown, Globe2, Wallet, CheckCircle2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  listMyReleases, createRelease, updateRelease, deleteRelease,
  submitReleaseForReview, addReleaseTrack, updateReleaseTrack, deleteReleaseTrack,
  getDistributionOverview, setReleaseDspTargets,
  RELEASE_TYPES, DSP_PLATFORMS,
} from "@/lib/distribution.functions";

export const Route = createFileRoute("/distribution")({
  head: () => ({
    meta: [
      { title: "Distribution — Tunevio" },
      { name: "description", content: "Submit your music for distribution review on Tunevio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DistributionPage,
});

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  submitted: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
  live: "bg-cyan-500/15 text-cyan-300",
};

function DistributionPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchReleases = useServerFn(listMyReleases);

  const fetchOverview = useServerFn(getDistributionOverview);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const releases = useQuery({
    queryKey: ["my-distribution-releases"],
    queryFn: () => fetchReleases(),
    enabled: !!auth.user,
  });
  const overview = useQuery({
    queryKey: ["my-distribution-overview"],
    queryFn: () => fetchOverview(),
    enabled: !!auth.user,
  });

  const visible = useMemo(() => {
    const list = (releases.data ?? []) as any[];
    const term = q.trim().toLowerCase();
    return list.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!term) return true;
      return (
        r.title?.toLowerCase().includes(term) ||
        r.artist_name?.toLowerCase().includes(term) ||
        r.tracks?.some((t: any) => t.title?.toLowerCase().includes(term))
      );
    });
  }, [releases.data, q, statusFilter]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-distribution-releases"] });
    qc.invalidateQueries({ queryKey: ["my-distribution-overview"] });
  };


  if (auth.loading) {
    return <div className="grid min-h-screen place-items-center text-white/50 text-sm">Loading…</div>;
  }
  if (!auth.user) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <Disc3 className="mx-auto mb-4 h-10 w-10 text-[#00E6FF]" />
          <h1 className="text-xl font-bold">Tunevio Distribution</h1>
          <p className="mt-2 text-sm text-white/50">Sign in to submit your music for distribution.</p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="mt-4 rounded-full bg-[#00E6FF] px-6 py-2 text-sm font-bold text-black"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const ov = overview.data as any;
  const counts = ov?.counts ?? {};
  const earnings = ov?.earnings ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00E6FF]">Tunevio Distribution</div>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Distribution Dashboard</h1>
        <p className="mt-1 text-sm text-white/50">
          Track every release, manage delivery details, and submit new music for review.
        </p>
      </header>

      {/* Status overview */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Disc3} label="Releases" value={String(ov?.total ?? 0)} sub={`${ov?.trackCount ?? 0} tracks`} />
        <StatCard icon={Clock} label="In review" value={String(counts.submitted ?? 0)} sub={`${counts.draft ?? 0} drafts`} />
        <StatCard icon={CheckCircle2} label="Live" value={String(counts.live ?? 0)} sub={`${counts.approved ?? 0} approved · ${counts.rejected ?? 0} rejected`} />
        <StatCard
          icon={Wallet}
          label="Available earnings"
          value={`$${(Number(earnings?.available_cents ?? 0) / 100).toFixed(2)}`}
          sub={`Pending $${(Number(earnings?.pending_cents ?? 0) / 100).toFixed(2)}`}
        />
      </div>

      <PipelineBar counts={counts} total={ov?.total ?? 0} />

      <div className="mt-6">
        <NewReleaseForm onCreated={refresh} />
      </div>

      {/* Release manager toolbar */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search releases or tracks…"
            className={`${inputCls} pl-9`}
          />
        </div>
        {["all", "draft", "submitted", "approved", "live", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
              statusFilter === s
                ? "border-[#00E6FF]/50 bg-[#00E6FF]/15 text-[#00E6FF]"
                : "border-white/10 text-white/50 hover:text-white"
            }`}
          >
            {s}
            {s !== "all" && counts[s] ? ` ${counts[s]}` : ""}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {releases.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center text-sm text-white/40">
            No releases yet — create your first one above.
          </div>
        )}
        {releases.data && releases.data.length > 0 && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center text-sm text-white/40">
            No releases match your search.
          </div>
        )}
        {visible.map((r: any) => (
          <ReleaseCard key={r.id} release={r} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}

async function uploadAsset(userId: string, file: File) {
  const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("distribution-assets").upload(path, file);
  if (error) throw new Error(error.message);
  return `distribution-assets:${path}`;
}

function NewReleaseForm({ onCreated }: { onCreated: () => void }) {
  const auth = useAuth();
  const create = useServerFn(createRelease);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", artist_name: "", release_type: "single" as string, genre: "",
    release_date: "", label_name: "", language: "en", is_explicit: false,
    songwriters: "", producers: "",
  });
  const [artwork, setArtwork] = useState<File | null>(null);

  async function submit() {
    if (!form.title.trim() || !form.artist_name.trim()) {
      toast.error("Title and artist name are required");
      return;
    }
    setSaving(true);
    try {
      let artwork_url: string | null = null;
      if (artwork && auth.user) artwork_url = await uploadAsset(auth.user.id, artwork);
      await create({
        data: {
          title: form.title.trim(),
          artist_name: form.artist_name.trim(),
          release_type: form.release_type as any,
          genre: form.genre || null,
          release_date: form.release_date || null,
          label_name: form.label_name || null,
          language: form.language || "en",
          is_explicit: form.is_explicit,
          songwriters: form.songwriters ? form.songwriters.split(",").map((s) => s.trim()).filter(Boolean) : [],
          producers: form.producers ? form.producers.split(",").map((s) => s.trim()).filter(Boolean) : [],
          artwork_url,
        },
      });
      toast.success("Release created — now add your tracks");
      setOpen(false);
      setForm({ title: "", artist_name: "", release_type: "single", genre: "", release_date: "", label_name: "", language: "en", is_explicit: false, songwriters: "", producers: "" });
      setArtwork(null);
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create release");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#00E6FF]/40 bg-[#00E6FF]/5 py-5 text-sm font-bold text-[#00E6FF] hover:bg-[#00E6FF]/10"
      >
        <Plus className="h-4 w-4" /> New Release
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">New Release</h2>
        <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Release title *"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
        <Field label="Artist name *"><input value={form.artist_name} onChange={(e) => setForm({ ...form, artist_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Type">
          <select value={form.release_type} onChange={(e) => setForm({ ...form, release_type: e.target.value })} className={inputCls}>
            {RELEASE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </Field>
        <Field label="Genre"><input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className={inputCls} placeholder="Hip-Hop, R&B…" /></Field>
        <Field label="Release date"><input type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} className={inputCls} /></Field>
        <Field label="Label name"><input value={form.label_name} onChange={(e) => setForm({ ...form, label_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Language"><input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls} placeholder="en" /></Field>
        <Field label="Artwork">
          <input type="file" accept="image/*" onChange={(e) => setArtwork(e.target.files?.[0] ?? null)} className="text-xs text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-[#00E6FF] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-black" />
        </Field>
        <Field label="Songwriters (comma separated)"><input value={form.songwriters} onChange={(e) => setForm({ ...form, songwriters: e.target.value })} className={inputCls} /></Field>
        <Field label="Producers (comma separated)"><input value={form.producers} onChange={(e) => setForm({ ...form, producers: e.target.value })} className={inputCls} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={form.is_explicit} onChange={(e) => setForm({ ...form, is_explicit: e.target.checked })} className="h-4 w-4 accent-[#FF00A6]" />
        Explicit content
      </label>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 rounded-full bg-[#00E6FF] px-6 py-2 text-sm font-bold text-black disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create Release"}
      </button>
    </div>
  );
}

function ReleaseCard({ release, onChanged }: { release: any; onChanged: () => void }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const submitReview = useServerFn(submitReleaseForReview);
  const remove = useServerFn(deleteRelease);
  const editable = release.status === "draft" || release.status === "rejected";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/5">
          <Music2 className="h-5 w-5 text-[#00E6FF]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{release.title}</div>
          <div className="text-xs text-white/50">
            {release.artist_name} · {release.release_type?.toUpperCase()} · {release.tracks.length} track{release.tracks.length === 1 ? "" : "s"}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[release.status]}`}>
          {release.status}
        </span>
        <button onClick={() => setOpen((v) => !v)} className="text-white/40 hover:text-white">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {release.status === "rejected" && release.review_notes && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <span className="font-bold">Review notes:</span> {release.review_notes}
        </div>
      )}

      {open && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-white/50 sm:grid-cols-4">
            {release.genre && <div>Genre: <span className="text-white/80">{release.genre}</span></div>}
            {release.release_date && <div>Date: <span className="text-white/80">{release.release_date}</span></div>}
            {release.label_name && <div>Label: <span className="text-white/80">{release.label_name}</span></div>}
            <div>Explicit: <span className="text-white/80">{release.is_explicit ? "Yes" : "No"}</span></div>
            {release.songwriters?.length > 0 && <div className="col-span-2">Writers: <span className="text-white/80">{release.songwriters.join(", ")}</span></div>}
            {release.producers?.length > 0 && <div className="col-span-2">Producers: <span className="text-white/80">{release.producers.join(", ")}</span></div>}
          </div>

          {editing && (
            <EditReleaseForm release={release} onDone={() => { setEditing(false); onChanged(); }} />
          )}

          <DeliveryPanel release={release} onChanged={onChanged} />

          <div className="mt-4 space-y-2">
            {release.tracks.map((t: any, i: number) => (
              <TrackRow
                key={t.id}
                track={t}
                editable={editable}
                onChanged={onChanged}
                neighbours={{ prev: release.tracks[i - 1] ?? null, next: release.tracks[i + 1] ?? null }}
              />
            ))}
          </div>

          {editable && <AddTrackForm releaseId={release.id} userId={auth.user!.id} nextNumber={release.tracks.length + 1} onAdded={onChanged} />}

          <div className="mt-4 flex flex-wrap gap-2">
            {editable && (
              <button
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold text-white/80 hover:bg-white/5"
              >
                <Pencil className="h-3 w-3" /> {editing ? "Close editor" : "Edit details"}
              </button>
            )}
            {editable && (
              <button
                onClick={async () => {
                  try {
                    await submitReview({ data: { id: release.id } });
                    toast.success("Submitted for review");
                    onChanged();
                  } catch (e: any) {
                    toast.error(e.message ?? "Could not submit");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FF00A6] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90"
              >
                <Send className="h-3 w-3" /> Submit for Review
              </button>
            )}
            {release.status === "draft" && (
              <button
                onClick={async () => {
                  if (!confirm("Delete this draft release?")) return;
                  await remove({ data: { id: release.id } });
                  toast.success("Draft deleted");
                  onChanged();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" /> Delete Draft
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrackRow({
  track, editable, onChanged, neighbours,
}: {
  track: any; editable: boolean; onChanged: () => void;
  neighbours?: { prev: any | null; next: any | null };
}) {
  const remove = useServerFn(deleteReleaseTrack);
  const patch = useServerFn(updateReleaseTrack);

  async function swap(other: any) {
    if (!other) return;
    try {
      await patch({ data: { id: track.id, patch: { track_number: other.track_number } } });
      await patch({ data: { id: other.id, patch: { track_number: track.track_number } } });
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Could not reorder");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
      {editable && (
        <div className="flex flex-col">
          <button
            onClick={() => swap(neighbours?.prev)}
            disabled={!neighbours?.prev}
            className="text-white/30 hover:text-[#00E6FF] disabled:opacity-20"
            aria-label="Move track up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => swap(neighbours?.next)}
            disabled={!neighbours?.next}
            className="text-white/30 hover:text-[#00E6FF] disabled:opacity-20"
            aria-label="Move track down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      )}
      <span className="w-6 text-center text-xs text-white/40">{track.track_number}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{track.title}</div>
        <div className="text-[11px] text-white/40">
          {track.featured_artists?.length ? `feat. ${track.featured_artists.join(", ")} · ` : ""}
          {track.isrc ? `ISRC ${track.isrc} · ` : ""}
          {track.audio_url ? "audio attached" : "no audio"}
          {track.splits?.length ? ` · splits: ${track.splits.map((s: any) => `${s.name} ${s.percent}%`).join(", ")}` : ""}
        </div>
      </div>
      {editable && (
        <button
          onClick={async () => { await remove({ data: { id: track.id } }); onChanged(); }}
          className="text-white/30 hover:text-red-300"
          aria-label="Remove track"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function AddTrackForm({ releaseId, userId, nextNumber, onAdded }: { releaseId: string; userId: string; nextNumber: number; onAdded: () => void }) {
  const add = useServerFn(addReleaseTrack);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", isrc: "", featured: "" });
  const [splits, setSplits] = useState<{ name: string; percent: number }[]>([]);
  const [audio, setAudio] = useState<File | null>(null);

  async function submit() {
    if (!form.title.trim()) { toast.error("Track title required"); return; }
    const total = splits.reduce((s, x) => s + (x.percent || 0), 0);
    if (total > 100) { toast.error(`Splits total ${total}% — must not exceed 100%`); return; }
    setSaving(true);
    try {
      let audio_url: string | null = null;
      if (audio) audio_url = await uploadAsset(userId, audio);
      await add({
        data: {
          release_id: releaseId,
          track: {
            title: form.title.trim(),
            track_number: nextNumber,
            isrc: form.isrc || null,
            featured_artists: form.featured ? form.featured.split(",").map((s) => s.trim()).filter(Boolean) : [],
            splits: splits.filter((s) => s.name.trim() && s.percent > 0),
            audio_url,
          },
        },
      });
      toast.success("Track added");
      setOpen(false);
      setForm({ title: "", isrc: "", featured: "" });
      setSplits([]);
      setAudio(null);
      onAdded();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add track");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#00E6FF] hover:underline">
        <Plus className="h-3 w-3" /> Add Track
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        Add Track {nextNumber}
        <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Track title *"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
        <Field label="ISRC (optional)"><input value={form.isrc} onChange={(e) => setForm({ ...form, isrc: e.target.value })} className={inputCls} placeholder="US-XXX-00-00000" /></Field>
        <Field label="Featured artists (comma separated)"><input value={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.value })} className={inputCls} /></Field>
        <Field label="Audio file">
          <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} className="text-xs text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-[#00E6FF] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-black" />
        </Field>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Revenue splits</div>
        {splits.map((s, i) => (
          <div key={i} className="mb-1.5 flex items-center gap-2">
            <input value={s.name} onChange={(e) => setSplits(splits.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name" className={inputCls} />
            <input type="number" min={0} max={100} value={s.percent || ""} onChange={(e) => setSplits(splits.map((x, j) => j === i ? { ...x, percent: Number(e.target.value) } : x))} placeholder="%" className={`${inputCls} w-20`} />
            <button onClick={() => setSplits(splits.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-300"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button onClick={() => setSplits([...splits, { name: "", percent: 0 }])} className="text-[11px] font-bold text-[#00E6FF] hover:underline">
          + Add split
        </button>
      </div>

      <button onClick={submit} disabled={saving} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#00E6FF] px-5 py-1.5 text-xs font-bold text-black disabled:opacity-50">
        <Upload className="h-3 w-3" /> {saving ? "Saving…" : "Save Track"}
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-[#00E6FF]/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</span>
      {children}
    </label>
  );
}

// ---------- Phase 2 components ----------

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 truncate text-2xl font-bold">{value}</div>
      {sub ? <div className="mt-1 truncate text-xs text-white/40">{sub}</div> : null}
    </div>
  );
}

const PIPELINE: { key: string; label: string; color: string }[] = [
  { key: "draft", label: "Draft", color: "#6b7280" },
  { key: "submitted", label: "In review", color: "#f59e0b" },
  { key: "approved", label: "Approved", color: "#10b981" },
  { key: "live", label: "Live", color: "#00E6FF" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
];

function PipelineBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (!total) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Release pipeline</div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/5">
        {PIPELINE.map((p) => {
          const n = counts[p.key] ?? 0;
          if (!n) return null;
          return <div key={p.key} style={{ width: `${(n / total) * 100}%`, background: p.color }} />;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
        {PIPELINE.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label} <span className="font-bold text-white/80">{counts[p.key] ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function EditReleaseForm({ release, onDone }: { release: any; onDone: () => void }) {
  const update = useServerFn(updateRelease);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: release.title ?? "",
    artist_name: release.artist_name ?? "",
    genre: release.genre ?? "",
    release_date: release.release_date ?? "",
    label_name: release.label_name ?? "",
    language: release.language ?? "en",
    upc: release.upc ?? "",
    is_explicit: !!release.is_explicit,
    songwriters: (release.songwriters ?? []).join(", "),
    producers: (release.producers ?? []).join(", "),
  });

  async function save() {
    if (!form.title.trim() || !form.artist_name.trim()) {
      toast.error("Title and artist name are required");
      return;
    }
    setSaving(true);
    try {
      await update({
        data: {
          id: release.id,
          patch: {
            title: form.title.trim(),
            artist_name: form.artist_name.trim(),
            genre: form.genre || null,
            release_date: form.release_date || null,
            label_name: form.label_name || null,
            language: form.language || "en",
            upc: form.upc || null,
            is_explicit: form.is_explicit,
            songwriters: form.songwriters ? form.songwriters.split(",").map((s) => s.trim()).filter(Boolean) : [],
            producers: form.producers ? form.producers.split(",").map((s) => s.trim()).filter(Boolean) : [],
          },
        },
      });
      toast.success("Release updated");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 text-sm font-bold">Edit release details</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Release title *"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
        <Field label="Artist name *"><input value={form.artist_name} onChange={(e) => setForm({ ...form, artist_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Genre"><input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className={inputCls} /></Field>
        <Field label="Release date"><input type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} className={inputCls} /></Field>
        <Field label="Label name"><input value={form.label_name} onChange={(e) => setForm({ ...form, label_name: e.target.value })} className={inputCls} /></Field>
        <Field label="Language"><input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls} /></Field>
        <Field label="UPC / barcode"><input value={form.upc} onChange={(e) => setForm({ ...form, upc: e.target.value })} className={inputCls} placeholder="Assigned on approval if blank" /></Field>
        <Field label="Songwriters (comma separated)"><input value={form.songwriters} onChange={(e) => setForm({ ...form, songwriters: e.target.value })} className={inputCls} /></Field>
        <Field label="Producers (comma separated)"><input value={form.producers} onChange={(e) => setForm({ ...form, producers: e.target.value })} className={inputCls} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={form.is_explicit} onChange={(e) => setForm({ ...form, is_explicit: e.target.checked })} className="h-4 w-4 accent-[#FF00A6]" />
        Explicit content
      </label>
      <button onClick={save} disabled={saving} className="mt-4 rounded-full bg-[#00E6FF] px-5 py-1.5 text-xs font-bold text-black disabled:opacity-50">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function DeliveryPanel({ release, onChanged }: { release: any; onChanged: () => void }) {
  const setTargets = useServerFn(setReleaseDspTargets);
  const [saving, setSaving] = useState(false);
  const targets: string[] = release.dsp_targets ?? [];
  const locked = release.status === "submitted" || release.status === "live";

  const tracks: any[] = release.tracks ?? [];
  const checklist = [
    { label: "Artwork uploaded", done: !!release.artwork_url },
    { label: "Release date set", done: !!release.release_date },
    { label: "At least one track with audio", done: tracks.some((t) => t.audio_url) },
    { label: "ISRC on every track", done: tracks.length > 0 && tracks.every((t) => t.isrc) },
    { label: "UPC assigned", done: !!release.upc },
    { label: "Delivery platforms selected", done: targets.length > 0 },
  ];

  async function toggle(id: string) {
    if (locked) return;
    const next = targets.includes(id) ? targets.filter((t) => t !== id) : [...targets, id];
    setSaving(true);
    try {
      await setTargets({ data: { id: release.id, dsp_targets: next } });
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Could not update platforms");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Globe2 className="h-4 w-4 text-[#00E6FF]" /> Delivery details
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Identifiers</div>
          <div className="text-xs text-white/60">
            UPC: <span className="font-mono text-white/85">{release.upc || "not assigned yet"}</span>
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-white/60">
            {tracks.length === 0 && <div>No tracks yet.</div>}
            {tracks.map((t) => (
              <div key={t.id} className="truncate">
                {t.track_number}. {t.title} — ISRC{" "}
                <span className="font-mono text-white/85">{t.isrc || "pending"}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Pre-delivery checklist</div>
          <div className="space-y-0.5">
            {checklist.map((c) => (
              <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.done ? "text-emerald-300" : "text-white/45"}`}>
                {c.done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
          Delivery platforms {locked && <span className="text-white/30">(locked while in review / live)</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {DSP_PLATFORMS.map((p) => {
            const on = targets.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={locked || saving}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
                  on
                    ? "border-[#C53DFF]/40 bg-[#C53DFF]/15 text-[#C53DFF]"
                    : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
