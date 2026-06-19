import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, X, UploadCloud, Loader2, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { submitPlayTrack } from "@/lib/play.functions";
import { signPlayAudioUrl } from "@/lib/play-audio.functions";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPT_ATTR =
  ".mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.webm,audio/*";
const COVER_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/*";

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
  const signFn = useServerFn(signPlayAudioUrl);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(defaultArtistName);
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [useBoost, setUseBoost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|oga|flac|webm)$/i.test(file.name)) {
      toast.error("Please choose an audio file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is too large. Max 50MB.");
      return;
    }
    setUploading(true);
    setProgress(5);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sign in to upload");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `play/${uid}/${Date.now()}-${safeName}`;
      const tick = setInterval(() => setProgress((p) => (p < 85 ? p + 5 : p)), 250);
      const { error: upErr } = await supabase.storage
        .from("artist-audio")
        .upload(path, file, {
          contentType: file.type || "audio/mpeg",
          upsert: false,
          cacheControl: "3600",
        });
      clearInterval(tick);
      if (upErr) throw new Error(upErr.message);
      setProgress(95);
      const { url } = await signFn({ data: { path } });
      setAudioUrl(url);
      setUploadedName(file.name);
      setProgress(100);
      toast.success("Track uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      toast.error("Image is too large. Max 8MB.");
      return;
    }
    setCoverUploading(true);
    setCoverProgress(10);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sign in to upload");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      // Path MUST start with `{uid}/` to satisfy the avatars bucket RLS policy.
      const path = `${uid}/play-covers/${Date.now()}.${ext || "jpg"}`;
      const tick = setInterval(() => setCoverProgress((p) => (p < 85 ? p + 8 : p)), 200);
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
          cacheControl: "3600",
        });
      clearInterval(tick);
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setCoverUrl(pub.publicUrl);
      setCoverProgress(100);
      toast.success("Cover art uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Cover upload failed");
      setCoverProgress(0);
    } finally {
      setCoverUploading(false);
    }
  }

  const submit = async () => {
    if (!title.trim() || !artistName.trim()) return;
    setBusy(true);
    try {
      const res: any = await submitFn({ data: { streamId, title, artistName, audioUrl, coverUrl, useBoost } });
      if (res?.routedToBattle) {
        toast.success(`Routed to Side ${String(res.battleSide).toUpperCase()} of the live battle`);
      } else {
        toast.success(useBoost ? "Boosted — jumping the line!" : "Track submitted to the queue");
      }
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

          {/* File upload */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition ${
              uploading ? "border-violet-400/60 bg-violet-500/5 pointer-events-none" :
              uploadedName ? "border-green-500/50 bg-green-500/5" :
              "border-white/15 bg-black/40 hover:border-violet-400/60"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }}
            />
            {uploading ? (
              <>
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-300" />
                <div className="mt-2 text-xs text-white/70">Uploading… {progress}%</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10">
                  <div className="h-full bg-violet-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </>
            ) : uploadedName ? (
              <div className="flex items-center justify-center gap-2 text-sm text-green-300">
                <CheckCircle2 className="h-4 w-4" />
                <span className="truncate max-w-[16rem]">{uploadedName}</span>
                <span className="text-white/40">· tap to replace</span>
              </div>
            ) : (
              <>
                <UploadCloud className="mx-auto h-6 w-6 text-violet-300" />
                <div className="mt-2 text-sm font-semibold">Upload your track</div>
                <div className="text-[11px] text-white/50">MP3, WAV, M4A, AAC, OGG, FLAC · max 50MB</div>
              </>
            )}
          </div>

          <div className="relative text-center text-[10px] uppercase tracking-widest text-white/30">
            <span className="bg-[#0d0d18] px-2 relative z-10">or paste a URL</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          </div>
          <input value={audioUrl} onChange={(e) => { setAudioUrl(e.target.value); setUploadedName(null); }}
            placeholder="Audio URL (SoundCloud, mp3, etc.)"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />

          {/* Cover art upload */}
          <div
            onClick={() => !coverUploading && coverRef.current?.click()}
            className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-3 cursor-pointer transition ${
              coverUploading ? "border-violet-400/60 bg-violet-500/5 pointer-events-none" :
              coverUrl ? "border-green-500/50 bg-green-500/5" :
              "border-white/15 bg-black/40 hover:border-violet-400/60"
            }`}
          >
            <input
              ref={coverRef}
              type="file"
              accept={COVER_ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCoverUpload(f); }}
            />
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-black/50 flex items-center justify-center">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-5 w-5 text-white/40" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              {coverUploading ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" /> Uploading… {coverProgress}%
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-white/10">
                    <div className="h-full bg-violet-400 transition-all" style={{ width: `${coverProgress}%` }} />
                  </div>
                </>
              ) : coverUrl ? (
                <div className="flex items-center gap-2 text-xs text-green-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Cover uploaded · tap to replace
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold">Upload cover art</div>
                  <div className="text-[11px] text-white/50">JPG, PNG, WebP · max 8MB · square works best</div>
                </>
              )}
            </div>
          </div>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="…or paste a cover image URL"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70" />

          {boostCredits > 0 && (
            <label className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={useBoost} onChange={(e) => setUseBoost(e.target.checked)} />
              <Crown className="h-4 w-4 text-amber-400" />
              Use 1 boost credit ({boostCredits} left) — jump the line
            </label>
          )}
          <button onClick={submit} disabled={busy || uploading || coverUploading || !title.trim() || !artistName.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
            {busy ? "Submitting…" : "Submit to live queue"}
          </button>
        </div>
      </div>
    </div>
  );
}