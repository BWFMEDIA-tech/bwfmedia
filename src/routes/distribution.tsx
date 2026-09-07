import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Disc3, Plus, Upload, Trash2, Send, ChevronDown, ChevronUp, Music2, X,
  Search, Pencil, ArrowUp, ArrowDown, Globe2, Wallet, CheckCircle2, Clock, Image as ImageIcon, ShieldCheck,
  Radio, AlertTriangle,
} from "lucide-react";
import { ArtworkUploader, ArtworkThumb, AudioUploader } from "@/components/distribution/AssetUploads";
import { formatDuration } from "@/lib/distribution-upload";
import { useAuth } from "@/lib/auth-context";
import {
  listMyReleases, createRelease, updateRelease, deleteRelease,
  submitReleaseForReview, addReleaseTrack, updateReleaseTrack, deleteReleaseTrack,
  getDistributionOverview, setReleaseDspTargets,
  RELEASE_TYPES, PRO_OPTIONS,
  listReleaseDeliveries, requestReleaseTakedown,
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
  const [artworkRef, setArtworkRef] = useState<string | null>(null);

  async function submit() {
    if (!form.title.trim() || !form.artist_name.trim()) {
      toast.error("Title and artist name are required");
      return;
    }
    setSaving(true);
    try {
      const artwork_url: string | null = artworkRef;

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
      setArtworkRef(null);
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
        <div className="sm:col-span-2">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/50">Cover artwork</span>
          {auth.user && (
            <ArtworkUploader userId={auth.user.id} value={artworkRef} onChange={setArtworkRef} />
          )}
        </div>

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
        {release.artwork_url ? (
          <ArtworkThumb value={release.artwork_url} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/5">
            <Music2 className="h-5 w-5 text-[#00E6FF]" />
          </div>
        )}
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

          <ArtworkPanel release={release} editable={editable} onChanged={onChanged} />

          <RightsPanel release={release} editable={editable} onChanged={onChanged} />

          <DeliveryEnginePanel release={release} onChanged={onChanged} />

          <DeliveryPanel release={release} onChanged={onChanged} />

          <div className="mt-4 space-y-2">
            {release.tracks.map((t: any, i: number) => (
              <TrackRow
                key={t.id}
                track={t}
                userId={auth.user!.id}
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
  track, userId, editable, onChanged, neighbours,
}: {
  track: any; userId: string; editable: boolean; onChanged: () => void;
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
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
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
            {track.audio_url ? `master ${formatDuration(track.duration_secs)}` : "no master audio"}
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

      <div className="mt-2 pl-1">
        <AudioUploader
          userId={userId}
          value={track.audio_url ?? null}
          durationSecs={track.duration_secs}
          disabled={!editable}
          compact
          onUploaded={async ({ ref, durationSecs }) => {
            await patch({ data: { id: track.id, patch: { audio_url: ref, duration_secs: durationSecs ?? null } } });
            onChanged();
          }}
        />
      </div>
    </div>
  );
}

function AddTrackForm({ releaseId, userId, nextNumber, onAdded }: { releaseId: string; userId: string; nextNumber: number; onAdded: () => void }) {
  const add = useServerFn(addReleaseTrack);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", isrc: "", featured: "" });
  const [splits, setSplits] = useState<{ name: string; percent: number }[]>([]);
  const [audio, setAudio] = useState<{ ref: string; durationSecs: number | null } | null>(null);


  async function submit() {
    if (!form.title.trim()) { toast.error("Track title required"); return; }
    const total = splits.reduce((s, x) => s + (x.percent || 0), 0);
    if (total > 100) { toast.error(`Splits total ${total}% — must not exceed 100%`); return; }
    setSaving(true);
    try {
      await add({
        data: {
          release_id: releaseId,
          track: {
            title: form.title.trim(),
            track_number: nextNumber,
            isrc: form.isrc || null,
            featured_artists: form.featured ? form.featured.split(",").map((s) => s.trim()).filter(Boolean) : [],
            splits: splits.filter((s) => s.name.trim() && s.percent > 0),
            audio_url: audio?.ref ?? null,
            duration_secs: audio?.durationSecs ?? null,
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
        <div className="sm:col-span-2">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/50">Master audio</span>
          <AudioUploader
            userId={userId}
            value={audio?.ref ?? null}
            durationSecs={audio?.durationSecs ?? null}
            compact
            onUploaded={({ ref, durationSecs }) => setAudio({ ref, durationSecs })}
          />
        </div>
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
            songwriters: form.songwriters ? String(form.songwriters).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
            producers: form.producers ? String(form.producers).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
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

const TUNEVIO_DESTINATIONS = [
  { id: "tunevio-streaming", label: "Tunevio Streaming" },
  { id: "tunevio-charts", label: "Tunevio Charts" },
  { id: "tunevio-radio", label: "Tunevio Live Radio" },
  { id: "tunevio-arena", label: "Mic Drop Arena" },
  { id: "tunevio-artist-profile", label: "Artist Profile" },
  { id: "tunevio-video", label: "Video Network" },
] as const;

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
    { label: "Tunevio destinations selected", done: targets.length > 0 },
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
          Tunevio destinations {locked && <span className="text-white/30">(locked while in review / live)</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {TUNEVIO_DESTINATIONS.map((p) => {
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
        <p className="mt-2 text-[11px] text-white/35">
          Tunevio delivers to its own native network. External store delivery is not part of this release pipeline.
        </p>
      </div>
    </div>
  );
}

// ---------- Phase 3: artwork panel ----------

function ArtworkPanel({ release, editable, onChanged }: { release: any; editable: boolean; onChanged: () => void }) {
  const auth = useAuth();
  const update = useServerFn(updateRelease);
  if (!auth.user) return null;

  async function save(ref: string | null) {
    try {
      await update({ data: { id: release.id, patch: { artwork_url: ref } } });
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Could not update artwork");
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        <ImageIcon className="h-4 w-4 text-[#00E6FF]" /> Cover artwork
      </div>
      {editable ? (
        <ArtworkUploader userId={auth.user.id} value={release.artwork_url ?? null} onChange={save} />
      ) : release.artwork_url ? (
        <ArtworkThumb value={release.artwork_url} className="h-24 w-24 rounded-xl object-cover" />
      ) : (
        <div className="text-xs text-white/40">No artwork uploaded.</div>
      )}
    </div>
  );
}


// ---------- Phase 4: metadata, rights & release identity ----------

const TERRITORY_OPTIONS = [
  { code: "US", label: "United States" }, { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" }, { code: "IE", label: "Ireland" },
  { code: "FR", label: "France" }, { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" }, { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" }, { code: "SE", label: "Sweden" },
  { code: "NG", label: "Nigeria" }, { code: "GH", label: "Ghana" },
  { code: "ZA", label: "South Africa" }, { code: "KE", label: "Kenya" },
  { code: "JM", label: "Jamaica" }, { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" }, { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" }, { code: "AU", label: "Australia" },
] as const;

type WriterCredit = { name: string; share: number; pro?: string; ipi?: string };

function RightsPanel({ release, editable, onChanged }: { release: any; editable: boolean; onChanged: () => void }) {
  const update = useServerFn(updateRelease);
  const [saving, setSaving] = useState(false);
  const year = new Date().getFullYear();
  const [form, setForm] = useState({
    p_line_year: release.p_line_year ? String(release.p_line_year) : String(year),
    p_line_holder: release.p_line_holder ?? "",
    c_line_year: release.c_line_year ? String(release.c_line_year) : String(year),
    c_line_holder: release.c_line_holder ?? "",
    publisher_name: release.publisher_name ?? "",
    pro_affiliation: release.pro_affiliation ?? "None",
    rights_confirmed: !!release.rights_confirmed,
    samples_cleared: !!release.samples_cleared,
    territory_mode: (release.territory_mode ?? "worldwide") as "worldwide" | "selected",
  });
  const [territories, setTerritories] = useState<string[]>(release.territories ?? []);
  const [writers, setWriters] = useState<WriterCredit[]>(
    Array.isArray(release.writer_credits) ? release.writer_credits : [],
  );

  const writerTotal = writers.reduce((sum, w) => sum + (Number(w.share) || 0), 0);

  async function save() {
    if (writerTotal > 100.0001) { toast.error("Writer shares can't exceed 100%"); return; }
    if (form.rights_confirmed && (!form.p_line_holder.trim() || !form.c_line_holder.trim())) {
      toast.error("Both copyright holders are required before confirming rights");
      return;
    }
    setSaving(true);
    try {
      await update({
        data: {
          id: release.id,
          patch: {
            p_line_year: Number(form.p_line_year) || null,
            p_line_holder: form.p_line_holder.trim() || null,
            c_line_year: Number(form.c_line_year) || null,
            c_line_holder: form.c_line_holder.trim() || null,
            publisher_name: form.publisher_name.trim() || null,
            pro_affiliation: form.pro_affiliation || null,
            rights_confirmed: form.rights_confirmed,
            samples_cleared: form.samples_cleared,
            territory_mode: form.territory_mode,
            territories: form.territory_mode === "selected" ? territories : [],
            writer_credits: writers
              .filter((w) => w.name.trim())
              .map((w) => ({
                name: w.name.trim().slice(0, 120),
                share: Number(w.share) || 0,
                pro: w.pro || undefined,
                ipi: w.ipi?.trim().slice(0, 20) || undefined,
              })),
          },
        },
      });
      toast.success("Rights saved");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save rights");
    } finally {
      setSaving(false);
    }
  }

  const identity = (
    <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] sm:grid-cols-2">
      <div>
        UPC: <span className="font-mono text-white/85">{release.upc || "issued by Tunevio on approval"}</span>
      </div>
      <div>
        ISRCs:{" "}
        <span className="font-mono text-white/85">
          {(release.tracks ?? []).filter((t: any) => t.isrc).length}/{(release.tracks ?? []).length} assigned
        </span>
      </div>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="h-4 w-4 text-[#FF00A6]" /> Rights &amp; release identity
        {release.rights_confirmed && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            confirmed
          </span>
        )}
      </div>

      <fieldset disabled={!editable || saving} className="space-y-3 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="℗ Sound recording year">
            <input value={form.p_line_year} onChange={(e) => setForm({ ...form, p_line_year: e.target.value })} className={inputCls} inputMode="numeric" />
          </Field>
          <Field label="℗ Sound recording owner">
            <input value={form.p_line_holder} onChange={(e) => setForm({ ...form, p_line_holder: e.target.value })} className={inputCls} placeholder="Label or artist name" maxLength={200} />
          </Field>
          <Field label="© Composition year">
            <input value={form.c_line_year} onChange={(e) => setForm({ ...form, c_line_year: e.target.value })} className={inputCls} inputMode="numeric" />
          </Field>
          <Field label="© Composition owner">
            <input value={form.c_line_holder} onChange={(e) => setForm({ ...form, c_line_holder: e.target.value })} className={inputCls} placeholder="Publisher or writer" maxLength={200} />
          </Field>
          <Field label="Publisher">
            <input value={form.publisher_name} onChange={(e) => setForm({ ...form, publisher_name: e.target.value })} className={inputCls} placeholder="Self-published" maxLength={200} />
          </Field>
          <Field label="Performing rights organisation">
            <select value={form.pro_affiliation} onChange={(e) => setForm({ ...form, pro_affiliation: e.target.value })} className={inputCls}>
              {PRO_OPTIONS.map((o) => <option key={o} value={o} className="bg-[#0d0d18]">{o}</option>)}
            </select>
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/50">
            <span>Writer credits</span>
            <span className={writerTotal > 100 ? "text-red-400" : "text-white/40"}>{writerTotal}% of 100%</span>
          </div>
          <div className="space-y-2">
            {writers.map((w, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  value={w.name}
                  onChange={(e) => setWriters(writers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="Writer name"
                  className={`${inputCls} col-span-5`}
                  maxLength={120}
                />
                <input
                  value={String(w.share ?? "")}
                  onChange={(e) => setWriters(writers.map((x, j) => (j === i ? { ...x, share: Number(e.target.value) || 0 } : x)))}
                  placeholder="%"
                  inputMode="decimal"
                  className={`${inputCls} col-span-2`}
                />
                <select
                  value={w.pro ?? ""}
                  onChange={(e) => setWriters(writers.map((x, j) => (j === i ? { ...x, pro: e.target.value } : x)))}
                  className={`${inputCls} col-span-2`}
                >
                  <option value="" className="bg-[#0d0d18]">PRO</option>
                  {PRO_OPTIONS.map((o) => <option key={o} value={o} className="bg-[#0d0d18]">{o}</option>)}
                </select>
                <input
                  value={w.ipi ?? ""}
                  onChange={(e) => setWriters(writers.map((x, j) => (j === i ? { ...x, ipi: e.target.value } : x)))}
                  placeholder="IPI"
                  className={`${inputCls} col-span-2`}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setWriters(writers.filter((_, j) => j !== i))}
                  className="col-span-1 rounded-md border border-white/10 text-white/40 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setWriters([...writers, { name: "", share: 0 }])}
            className="mt-2 rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/60 hover:text-white"
          >
            + Add writer
          </button>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">Territory rights</div>
          <div className="flex gap-2">
            {(["worldwide", "selected"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setForm({ ...form, territory_mode: m })}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold capitalize transition ${
                  form.territory_mode === m
                    ? "border-[#00E6FF]/40 bg-[#00E6FF]/15 text-[#00E6FF]"
                    : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {form.territory_mode === "selected" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TERRITORY_OPTIONS.map((t) => {
                const on = territories.includes(t.code);
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setTerritories(on ? territories.filter((c) => c !== t.code) : [...territories, t.code])}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                      on ? "border-[#C53DFF]/40 bg-[#C53DFF]/15 text-[#C53DFF]" : "border-white/10 text-white/45 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <label className="flex items-start gap-2 text-xs text-white/70">
          <input type="checkbox" checked={form.samples_cleared} onChange={(e) => setForm({ ...form, samples_cleared: e.target.checked })} className="mt-0.5" />
          All samples, interpolations and features in this release are cleared.
        </label>
        <label className="flex items-start gap-2 text-xs text-white/70">
          <input type="checkbox" checked={form.rights_confirmed} onChange={(e) => setForm({ ...form, rights_confirmed: e.target.checked })} className="mt-0.5" />
          I own or control all rights to this release and have permission to distribute it on Tunevio.
        </label>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-[#FF00A6] px-4 py-2 text-xs font-bold text-black hover:bg-[#ff33b8] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save rights"}
        </button>
      </fieldset>

      {identity}
    </div>
  );
}

// ---------- Phase 5: delivery engine (artist view) ----------

const DELIVERY_STYLES: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  failed: "bg-red-500/15 text-red-300",
  taken_down: "bg-white/10 text-white/50",
};

function DeliveryEnginePanel({ release, onChanged }: { release: any; onChanged: () => void }) {
  const listDeliveries = useServerFn(listReleaseDeliveries);
  const requestTakedown = useServerFn(requestReleaseTakedown);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: deliveries = [] } = useQuery({
    queryKey: ["distribution-deliveries", release.id],
    queryFn: () => listDeliveries({ data: { release_id: release.id } }) as Promise<any[]>,
  });

  const live = release.status === "live";
  const requested = release.takedown_status === "requested";

  async function submitTakedown() {
    setBusy(true);
    try {
      await requestTakedown({ data: { id: release.id, reason } });
      toast.success("Takedown requested — an admin will review it");
      setReason("");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Could not request takedown");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Radio className="h-4 w-4 text-[#00E6FF]" /> Delivery status
      </div>

      {deliveries.length === 0 ? (
        <p className="text-xs text-white/40">
          Not delivered yet. Tunevio publishes your tracks to the network once the release is approved.
        </p>
      ) : (
        <div className="space-y-1.5">
          {deliveries.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-[11px]">
              <span className="font-semibold text-white/85">{d.destination}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DELIVERY_STYLES[d.status] ?? "bg-white/10 text-white/50"}`}>
                {String(d.status).replace("_", " ")}
              </span>
              <span className="text-white/40">
                {d.tracks_published} track{d.tracks_published === 1 ? "" : "s"}
                {d.delivered_at && ` · ${new Date(d.delivered_at).toLocaleDateString()}`}
              </span>
              {d.last_error && <span className="text-red-300">{d.last_error}</span>}
            </div>
          ))}
        </div>
      )}

      {live && !requested && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Request takedown
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              placeholder="Why should this come down?"
              className={`${inputCls} flex-1 min-w-[200px]`}
            />
            <button
              onClick={submitTakedown}
              disabled={busy}
              className="rounded-md border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
            >
              Request takedown
            </button>
          </div>
        </div>
      )}

      {requested && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Takedown requested{release.takedown_requested_at ? ` on ${new Date(release.takedown_requested_at).toLocaleDateString()}` : ""} — waiting for admin review.
        </div>
      )}

      {release.takedown_status === "approved" && (
        <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-white/60">
          This release was taken down and removed from the Tunevio catalog.
        </div>
      )}
    </div>
  );
}
