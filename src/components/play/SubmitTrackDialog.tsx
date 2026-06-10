import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, X } from "lucide-react";
import { toast } from "sonner";
import { submitPlayTrack } from "@/lib/play.functions";

export function SubmitTrackDialog({
  streamId, defaultArtistName, boostCredits, onClose, onSubmitted,
}: {
  streamId: string;
  defaultArtistName: string;
  boostCredits: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const submitFn = useServerFn(submitPlayTrack);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(defaultArtistName);
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [useBoost, setUseBoost] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !artistName.trim()) return;
    setBusy(true);
    try {
      await submitFn({ data: { streamId, title, artistName, audioUrl, coverUrl, useBoost } });
      toast.success(useBoost ? "Boosted — jumping the line!" : "Track submitted");
      onSubmitted();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-bold mb-4">Submit a track</h2>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Audio URL (SoundCloud, mp3, etc.) — optional"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="Cover image URL (optional)"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
          {boostCredits > 0 && (
            <label className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={useBoost} onChange={(e) => setUseBoost(e.target.checked)} />
              <Crown className="h-4 w-4 text-amber-400" />
              Use 1 boost credit ({boostCredits} left) — jump the line
            </label>
          )}
          <button onClick={submit} disabled={busy || !title.trim() || !artistName.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
            {busy ? "Submitting…" : "Submit to live queue"}
          </button>
        </div>
      </div>
    </div>
  );
}