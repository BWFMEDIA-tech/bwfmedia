import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, X, UploadCloud, Loader2, CheckCircle2, Image as ImageIcon, Music2 } from "lucide-react";
import { toast } from "sonner";
import { submitPlayTrack } from "@/lib/play.functions";
import { signPlayAudioUrl } from "@/lib/play-audio.functions";
import { readAudioDurationSeconds } from "@/lib/audio-duration";
import { supabase } from "@/integrations/supabase/client";
import { SignedImg } from "@/components/ui/signed-img";

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
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
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
  type ProfileTrack = { id: string; title: string; audio_url: string | null; cover_url: string | null; duration_seconds: number | null };
  const [profileTracks, setProfileTracks] = useState<ProfileTrack[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [pickedProfileId, setPickedProfileId] = useState<string>("");

  // Load the signed-in artist's existing profile tracks once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from("play_tracks")
          .select("id, title, audio_url, cover_url, duration_seconds, created_at")
          .eq("artist_user_id", uid)
          .neq("status", "removed")
          .order("created_at", { ascending: false })
          .limit(100);
        if (cancelled || !data) return;
        const seen = new Set<string>();
        const unique: ProfileTrack[] = [];
        for (const t of data as any[]) {
          const key = (t.title ?? "").trim().toLowerCase();
          const fileKey = t.audio_url ? String(t.audio_url).split("?")[0] : "";
          if (!key || !t.audio_url || seen.has(key) || seen.has(fileKey)) continue;
          seen.add(key);
          seen.add(fileKey);
          unique.push({ id: t.id, title: t.title, audio_url: t.audio_url, cover_url: t.cover_url, duration_seconds: t.duration_seconds ?? null });
        }
        setProfileTracks(unique);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function pickProfileTrack(id: string) {
    setPickedProfileId(id);
    if (!id) return;
    const t = profileTracks.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title);
    if (t.audio_url) setAudioUrl(t.audio_url);
    if (t.cover_url) setCoverUrl(t.cover_url);
    setDurationSeconds(t.duration_seconds ?? null);
    setUploadedName(t.title);
  }

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
    // Record the real duration so track rows show minutes instead of "--:--".
    const measured = await readAudioDurationSeconds(file);
    setDurationSeconds(measured);
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
    if (!pickedProfileId || !title.trim() || !artistName.trim()) return;
    setBusy(true);
    try {
      // Duplicate guard: refuse to submit a track the artist has already
      // uploaded (matched by case-insensitive title across any stream /
      // profile). New songs must be genuinely new.
      // When the artist picked an existing profile track, skip the duplicate
      // guard — they're re-queueing their own song into this stream.
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      let finalAudio = audioUrl;
      let finalCover = coverUrl;
      if (uid) {
        // Never queue the same song twice in this live.
        const { data: inQueue } = await supabase
          .from("play_tracks")
          .select("id")
          .eq("artist_user_id", uid)
          .eq("stream_id", streamId)
          .in("status", ["queued", "playing"])
          .ilike("title", title.trim());
        if (inQueue && inQueue.length > 0) {
          setBusy(false);
          toast.error("This track is already in the live queue");
          return;
        }
        // If the song already exists on the site, reuse it instead of adding a copy.
        if (!pickedProfileId) {
          const existing = profileTracks.find(
            (t) => t.title.trim().toLowerCase() === title.trim().toLowerCase(),
          );
          if (existing) {
            if (existing.audio_url) finalAudio = existing.audio_url;
            if (existing.cover_url && !finalCover) finalCover = existing.cover_url;
            toast.message("Using your existing track", { description: existing.title });
          }
        }
      }
      const res: any = await submitFn({ data: { streamId, title, artistName, audioUrl: finalAudio, coverUrl: finalCover, useBoost, durationSeconds } });
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
          {loadingProfile && profileTracks.length === 0 && (
            <div className="text-xs text-white/50">Loading your profile tracks…</div>
          )}
          {!loadingProfile && profileTracks.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-black/40 p-4 text-center text-sm text-white/70">
              No songs on your profile yet. Upload music to your artist profile first, then come back to submit.
            </div>
          )}
          {profileTracks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                <Music2 className="h-3.5 w-3.5" /> Choose a song from your profile
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {profileTracks.map((t) => (
                  <button key={t.id} type="button" onClick={() => pickProfileTrack(t.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                      pickedProfileId === t.id ? "border-cyan-400/70 bg-cyan-500/10" : "border-white/10 bg-black/40 hover:border-white/30"
                    }`}>
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-black/50 flex items-center justify-center">
                      {t.cover_url ? <SignedImg src={t.cover_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-white/40" />}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    {pickedProfileId === t.id && <CheckCircle2 className="h-4 w-4 text-cyan-300" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {boostCredits > 0 && (
            <label className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={useBoost} onChange={(e) => setUseBoost(e.target.checked)} />
              <Crown className="h-4 w-4 text-amber-400" />
              Use 1 boost credit ({boostCredits} left) — jump the line
            </label>
          )}
          <button onClick={submit} disabled={busy || !pickedProfileId || !title.trim() || !artistName.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 py-2.5 text-sm font-semibold disabled:opacity-50">
            {busy ? "Submitting…" : "Submit to live queue"}
          </button>
        </div>
      </div>
    </div>
  );
}