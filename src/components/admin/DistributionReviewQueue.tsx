import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Rocket, ChevronDown, ChevronUp, Music2, Disc3, Fingerprint, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listDistributionQueue, reviewRelease, assignReleaseIdentifiers, type ReleaseStatus } from "@/lib/distribution.functions";
import { Card, EmptyState } from "./AdminShell";

const FILTERS: { key: ReleaseStatus | "all"; label: string }[] = [
  { key: "submitted", label: "Pending Review" },
  { key: "approved", label: "Approved" },
  { key: "live", label: "Live" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  submitted: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
  live: "bg-cyan-500/15 text-cyan-300",
};

export function DistributionReviewQueue() {
  const qc = useQueryClient();
  const fetchQueue = useServerFn(listDistributionQueue);
  const [filter, setFilter] = useState<ReleaseStatus | "all">("submitted");

  const queue = useQuery({
    queryKey: ["admin-distribution-queue", filter],
    queryFn: () => fetchQueue({ data: { status: filter === "all" ? undefined : filter } }),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              filter === f.key ? "bg-blue-600 text-white" : "border border-white/10 text-white/50 hover:bg-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {queue.data?.length === 0 && (
        <EmptyState icon={Disc3} title="Nothing here" hint="No releases match this filter yet." />
      )}

      <div className="space-y-4">
        {queue.data?.map((r: any) => (
          <QueueCard
            key={r.id}
            release={r}
            onChanged={() => qc.invalidateQueries({ queryKey: ["admin-distribution-queue"] })}
          />
        ))}
      </div>
    </div>
  );
}

async function signAsset(ref: string | null): Promise<string | null> {
  if (!ref?.startsWith("distribution-assets:")) return null;
  const path = ref.slice("distribution-assets:".length);
  const { data, error } = await supabase.storage.from("distribution-assets").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

function QueueCard({ release, onChanged }: { release: any; onChanged: () => void }) {
  const review = useServerFn(reviewRelease);
  const assignIds = useServerFn(assignReleaseIdentifiers);

  async function issueIdentifiers() {
    setBusy(true);
    try {
      const res: any = await assignIds({ data: { id: release.id } });
      toast.success(`UPC ${res?.upc} · ${res?.tracks_assigned ?? 0} ISRC(s) issued`);
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Could not issue identifiers");
    } finally {
      setBusy(false);
    }
  }
  const [open, setOpen] = useState(release.status === "submitted");
  const [notes, setNotes] = useState(release.review_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, string | null>>({});
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkLoaded, setArtworkLoaded] = useState(false);

  async function loadAudio(trackId: string, ref: string) {
    if (audioUrls[trackId]) return;
    const url = await signAsset(ref);
    setAudioUrls((p) => ({ ...p, [trackId]: url }));
  }

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !artworkLoaded) {
      setArtworkLoaded(true);
      setArtworkUrl(await signAsset(release.artwork_url));
      release.tracks.forEach((t: any) => t.audio_url && loadAudio(t.id, t.audio_url));
    }
  }

  async function decide(decision: "approved" | "rejected" | "live") {
    if (decision === "rejected" && !notes.trim()) {
      toast.error("Add review notes so the artist knows what to fix");
      return;
    }
    setBusy(true);
    try {
      await review({ data: { id: release.id, decision, notes: notes || null } });
      toast.success(`Release ${decision}`);
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="!p-5">
      <div className="flex flex-wrap items-center gap-3">
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/5">
            <Music2 className="h-5 w-5 text-blue-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{release.title}</div>
          <div className="text-xs text-white/50">
            {release.artist_name} · {release.release_type?.toUpperCase()} · {release.tracks.length} track{release.tracks.length === 1 ? "" : "s"}
            {release.submitted_at && ` · submitted ${new Date(release.submitted_at).toLocaleDateString()}`}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[release.status]}`}>
          {release.status}
        </span>
        <button onClick={toggleOpen} className="text-white/40 hover:text-white">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-white/50 sm:grid-cols-4">
            {release.genre && <div>Genre: <span className="text-white/80">{release.genre}</span></div>}
            {release.release_date && <div>Date: <span className="text-white/80">{release.release_date}</span></div>}
            {release.label_name && <div>Label: <span className="text-white/80">{release.label_name}</span></div>}
            <div>Explicit: <span className="text-white/80">{release.is_explicit ? "Yes" : "No"}</span></div>
            {release.language && <div>Language: <span className="text-white/80">{release.language}</span></div>}
            {release.upc && <div>UPC: <span className="text-white/80">{release.upc}</span></div>}
            {release.songwriters?.length > 0 && <div className="col-span-2">Writers: <span className="text-white/80">{release.songwriters.join(", ")}</span></div>}
            {release.producers?.length > 0 && <div className="col-span-2">Producers: <span className="text-white/80">{release.producers.join(", ")}</span></div>}
          </div>

          <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
            <div className="mb-2 flex items-center gap-2 font-bold">
              {release.rights_confirmed ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              )}
              Rights &amp; identity
              <span className={release.rights_confirmed ? "text-emerald-300" : "text-amber-300"}>
                {release.rights_confirmed ? "ownership confirmed" : "not confirmed"}
              </span>
              {release.samples_cleared && <span className="text-white/50">· samples cleared</span>}
            </div>
            <div className="grid grid-cols-1 gap-1 text-white/50 sm:grid-cols-2">
              <div>℗ <span className="text-white/80">{release.p_line_year ?? "—"} {release.p_line_holder ?? ""}</span></div>
              <div>© <span className="text-white/80">{release.c_line_year ?? "—"} {release.c_line_holder ?? ""}</span></div>
              <div>Publisher: <span className="text-white/80">{release.publisher_name || "self-published"}</span></div>
              <div>PRO: <span className="text-white/80">{release.pro_affiliation || "—"}</span></div>
              <div className="sm:col-span-2">
                Territories:{" "}
                <span className="text-white/80">
                  {release.territory_mode === "selected"
                    ? (release.territories ?? []).join(", ") || "none selected"
                    : "Worldwide"}
                </span>
              </div>
              {Array.isArray(release.writer_credits) && release.writer_credits.length > 0 && (
                <div className="sm:col-span-2">
                  Writers:{" "}
                  <span className="text-white/80">
                    {release.writer_credits
                      .map((w: any) => `${w.name} ${w.share}%${w.pro ? ` (${w.pro}${w.ipi ? ` ${w.ipi}` : ""})` : ""}`)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {release.tracks.map((t: any) => (
              <div key={t.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                <div className="text-sm font-semibold">
                  {t.track_number}. {t.title}
                  {t.featured_artists?.length > 0 && <span className="text-white/50"> feat. {t.featured_artists.join(", ")}</span>}
                </div>
                <div className="text-[11px] text-white/40">
                  {t.isrc && `ISRC ${t.isrc} · `}
                  {t.splits?.length > 0 && `splits: ${t.splits.map((s: any) => `${s.name} ${s.percent}%`).join(", ")}`}
                </div>
                {audioUrls[t.id] && (
                  <audio controls preload="none" src={audioUrls[t.id]!} className="mt-2 h-8 w-full" />
                )}
              </div>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Review notes (required when rejecting — the artist sees these)…"
            className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-blue-500/50"
            rows={2}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {release.status === "submitted" && (
              <>
                <button
                  onClick={() => decide("approved")}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => decide("rejected")}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600/80 px-4 py-2 text-xs font-bold hover:bg-red-500 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </>
            )}
            {(release.status === "approved" || release.status === "live") && (
              <button
                onClick={issueIdentifiers}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-4 py-2 text-xs font-bold text-white/80 hover:text-white disabled:opacity-50"
              >
                <Fingerprint className="h-3.5 w-3.5" /> Issue missing identifiers
              </button>
            )}
            {release.status === "approved" && (
              <button
                onClick={() => decide("live")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-4 py-2 text-xs font-bold hover:bg-cyan-500 disabled:opacity-50"
              >
                <Rocket className="h-3.5 w-3.5" /> Mark as Live
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
