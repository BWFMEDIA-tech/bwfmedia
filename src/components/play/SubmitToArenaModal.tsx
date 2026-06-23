import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Rocket, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { listLiveArenas, submitSongToArena } from "@/lib/play-arena-submissions.functions";

type Priority = "standard" | "boosted" | "featured";

export function SubmitToArenaModal({
  song,
  onClose,
  onSubmitted,
}: {
  song: { id: string; title: string; artist_name?: string | null; cover_url?: string | null };
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const listArenas = useServerFn(listLiveArenas);
  const submit = useServerFn(submitSongToArena);
  const [arenas, setArenas] = useState<any[]>([]);
  const [arenaId, setArenaId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("standard");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listArenas();
        setArenas(rows as any[]);
        if ((rows as any[]).length > 0) setArenaId((rows as any[])[0].id);
      } catch (e: any) {
        toast.error(e?.message ?? "Couldn't load arenas");
      } finally {
        setLoading(false);
      }
    })();
  }, [listArenas]);

  async function handleSubmit() {
    if (!arenaId) return toast.error("Pick an arena");
    setSubmitting(true);
    try {
      await submit({ data: { songId: song.id, arenaId, message: message || undefined, priority } });
      toast.success("Submitted to Play Arena");
      onSubmitted?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-lg bg-white/5">
              {song.cover_url && <img src={song.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-fuchsia-400">Submit to Play Arena</div>
              <div className="truncate text-base font-bold text-white">{song.title}</div>
              {song.artist_name && <div className="truncate text-xs text-white/50">{song.artist_name}</div>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/60 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-white/60">Arena</label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-white/50"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading arenas…</div>
            ) : arenas.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/60">No arenas available right now.</div>
            ) : (
              <select
                value={arenaId}
                onChange={(e) => setArenaId(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
              >
                {arenas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} {a.status === "live" ? "• LIVE" : "• Upcoming"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-white/60">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="A note for the host…"
              className="w-full resize-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-fuchsia-500"
            />
            <div className="mt-1 text-right text-[10px] text-white/40">{message.length}/280</div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-white/60">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: "standard", label: "Standard", icon: <Rocket className="h-3.5 w-3.5" /> },
                  { v: "boosted", label: "Boosted", icon: <Zap className="h-3.5 w-3.5" /> },
                  { v: "featured", label: "Featured", icon: <Sparkles className="h-3.5 w-3.5" /> },
                ] as { v: Priority; label: string; icon: any }[]
              ).map((p) => (
                <button
                  key={p.v}
                  onClick={() => setPriority(p.v)}
                  className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${
                    priority === p.v
                      ? "border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-200"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
            {priority !== "standard" && (
              <div className="mt-2 text-[10px] text-white/40">Boost pricing coming soon — free during launch.</div>
            )}
          </div>

          <button
            disabled={submitting || loading || !arenaId}
            onClick={handleSubmit}
            className="w-full rounded-md bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-fuchsia-500/30 transition hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit to Arena"}
          </button>
        </div>
      </div>
    </div>
  );
}