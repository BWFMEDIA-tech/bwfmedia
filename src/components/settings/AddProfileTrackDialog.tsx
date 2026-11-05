import { useEffect, useRef, useState } from "react";
import { X, UploadCloud, Loader2, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readAudioDurationSeconds } from "@/lib/audio-duration";
import { saveUploadedProfileTrack, type UploadedProfileTrack } from "@/lib/profile-track-upload";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_COVER_BYTES = 8 * 1024 * 1024;

export function AddProfileTrackDialog({
  defaultArtistName,
  onClose,
  onAdded,
}: {
  defaultArtistName: string;
  onClose: () => void;
  onAdded: (track: UploadedProfileTrack) => void;
}) {
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState(defaultArtistName);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Unsaved uploads stay private: preview the local file, not a public signature.
  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  async function handleAudio(file: File) {
    if (file.size > MAX_BYTES) return toast.error("Max 50MB.");
    setUploading(true); setProgress(5);
    // Record the real duration so track rows show minutes instead of "--:--".
    const durationSeconds = await readAudioDurationSeconds(file);
    setAudioDurationSeconds(durationSeconds);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sign in required");
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `play/${uid}/${Date.now()}-${safe}`;
      const tick = setInterval(() => setProgress((p) => (p < 85 ? p + 5 : p)), 250);
      const { error } = await supabase.storage.from("artist-audio").upload(path, file, {
        contentType: file.type || "audio/mpeg", upsert: false, cacheControl: "3600",
      });
      clearInterval(tick);
      if (error) throw error;
      // Sign a long-lived URL for profile playback
      const { data: signed, error: sErr } = await supabase.storage
        .from("artist-audio").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr) throw sErr;
      setAudioUrl(signed.signedUrl);
      setUploadedName(file.name);
      setProgress(100);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed"); setProgress(0);
    } finally { setUploading(false); }
  }

  async function handleCover(file: File) {
    if (file.size > MAX_COVER_BYTES) return toast.error("Max 8MB.");
    setCoverUploading(true); setCoverProgress(10);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sign in required");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${uid}/play-covers/${Date.now()}.${ext || "jpg"}`;
      const tick = setInterval(() => setCoverProgress((p) => (p < 85 ? p + 8 : p)), 200);
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type || "image/jpeg", upsert: false, cacheControl: "3600",
      });
      clearInterval(tick);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setCoverUrl(pub.publicUrl);
      setCoverPreview(URL.createObjectURL(file));
      setCoverProgress(100);
    } catch (e: any) {
      toast.error(e?.message ?? "Cover upload failed"); setCoverProgress(0);
    } finally { setCoverUploading(false); }
  }

  async function submit() {
    if (!title.trim() || !artistName.trim() || !audioUrl) {
      return toast.error("Title, artist, and audio are required");
    }
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const saved = await saveUploadedProfileTrack(supabase, {
        title, artistName, audioUrl, coverUrl: coverUrl || null, durationSeconds: audioDurationSeconds,
      });
      toast.success("Track added to your profile");
      onAdded(saved);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add track");
    } finally { saving.current = false; setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg border border-border bg-card p-6">
        <Button variant="ghost" size="icon" aria-label="Close upload" disabled={busy || uploading || coverUploading} onClick={onClose} className="absolute right-3 top-3">
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold mb-4">Add a track</h2>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Track title" placeholder="Track title"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={artistName} onChange={(e) => setArtistName(e.target.value)} aria-label="Artist name" placeholder="Artist name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />

          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition ${
              uploading ? "border-primary/60 bg-primary/5 pointer-events-none" :
              uploadedName ? "border-primary/50 bg-primary/5" :
              "border-border bg-background hover:border-primary/60"
            }`}
          >
            <input ref={fileRef} aria-label="Audio file" type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.webm,audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAudio(f); }} />
            {uploading ? (
              <>
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                <div className="mt-2 text-xs text-muted-foreground">Uploading… {progress}%</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </>
            ) : uploadedName ? (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span className="truncate max-w-[16rem]">{uploadedName}</span>
                <span className="text-muted-foreground">· tap to replace</span>
              </div>
            ) : (
              <>
                <UploadCloud className="mx-auto h-6 w-6 text-primary" />
                <div className="mt-2 text-sm font-semibold">Upload your track</div>
                <div className="text-[11px] text-muted-foreground">MP3, WAV, M4A, AAC, OGG, FLAC · max 50MB</div>
              </>
            )}
          </div>

          <div
            onClick={() => !coverUploading && coverRef.current?.click()}
            className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-3 cursor-pointer transition ${
              coverUploading ? "border-primary/60 bg-primary/5 pointer-events-none" :
              coverUrl ? "border-primary/50 bg-primary/5" :
              "border-border bg-background hover:border-primary/60"
            }`}
          >
            <input ref={coverRef} aria-label="Cover artwork" type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCover(f); }} />
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              {coverUploading ? (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Uploading… {coverProgress}%
                </div>
              ) : coverUrl ? (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Cover uploaded · tap to replace
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold">Upload cover art (optional)</div>
                  <div className="text-[11px] text-muted-foreground">JPG, PNG, WebP · max 8MB</div>
                </>
              )}
            </div>
          </div>

          <Button onClick={submit} disabled={busy || uploading || coverUploading || !title.trim() || !artistName.trim() || !audioUrl}
            className="w-full">
            {busy ? "Adding…" : "Add to my profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}