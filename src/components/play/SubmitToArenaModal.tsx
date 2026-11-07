import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Headphones, Loader2, Rocket, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { getBoostWallet } from "@/lib/boost-economy.functions";
import { listLiveArenas, submitSongToArena } from "@/lib/play-arena-submissions.functions";
import { SignedImg } from "@/components/ui/signed-img";
import { arenaSubmissionChoices } from "@/lib/arena-picker";

type Priority = "standard" | "boosted" | "featured";

export function SubmitToArenaModal({
  song,
  onClose,
  onSubmitted,
}: {
  song: { id: string; title: string; artist_name?: string | null; cover_url?: string | null; play_count?: number | null };
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
  const [balance, setBalance] = useState<number | null>(null);
  const boostCost = priority === "featured" ? 2 : priority === "boosted" ? 1 : 0;

  useEffect(() => {
    (async () => {
      try {
        const rows = await listArenas();
        const choices = arenaSubmissionChoices(rows as Array<{ id: string; title: string; status: string }>);
        setArenas(choices);
        setArenaId(choices[0]?.id ?? "");
      } catch (e: any) {
        toast.error(e?.message ?? "Couldn't load arenas");
      } finally {
        setLoading(false);
      }
    })();
  }, [listArenas]);

  useEffect(() => {
    (async () => {
      try {
        const wallet = await getBoostWallet();
        setBalance(wallet.balance);
      } catch {
        // balance stays unknown; the server still enforces the spend
      }
    })();
  }, []);

  async function handleSubmit() {
    if (!arenaId) return toast.error("Pick an arena");
    if (boostCost > 0 && balance !== null && balance < boostCost) {
      return toast.error(`Not enough boost credits — you need ${boostCost} but have ${balance}. Get more on the Credits page.`);
    }
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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-gradient-to-b from-card to-background p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted">
              {song.cover_url && <SignedImg src={song.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-primary">Submit to Play Arena</div>
              <div className="truncate text-base font-bold text-foreground">{song.title}</div>
              <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                {song.artist_name && <span className="truncate">{song.artist_name}</span>}
                <span
                  className="inline-flex items-center gap-1 text-muted-foreground"
                  title={`${(song.play_count ?? 0).toLocaleString()} plays`}
                >
                  <Headphones className="h-3 w-3" />
                  <span className="tabular-nums">{(song.play_count ?? 0).toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="arena-destination" className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Choose an Arena</label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading arenas…</div>
            ) : arenas.length === 0 ? (
              <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">No arenas available right now.</div>
            ) : (
              <select
                id="arena-destination"
                value={arenaId}
                onChange={(e) => setArenaId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                {arenas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title?.trim() || "Untitled Arena"} {a.status === "live" ? "• Live now" : "• Accepting songs"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="A note for the host…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{message.length}/280</div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">Priority</label>
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
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
            {priority !== "standard" && (
              <div className="mt-2 text-[10px] text-muted-foreground">
                Priority placement costs {boostCost} boost credit{boostCost === 1 ? "" : "s"} —
                {balance === null ? " checking your balance…" : ` you have ${balance}.`}{" "}
                <a href="/credits" className="underline hover:text-primary">Get credits</a>
              </div>
            )}
          </div>

          <button
            disabled={submitting || loading || !arenaId || (boostCost > 0 && balance !== null && balance < boostCost)}
            onClick={handleSubmit}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit to Arena"}
          </button>
        </div>
      </div>
    </div>
  );
}