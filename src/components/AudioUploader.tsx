import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, X, Music, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { attachAudioToSubmission } from "@/lib/attach-audio.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RED = "#ef2b2b";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"];
const ACCEPT_ATTR = ".mp3,.wav,audio/mpeg,audio/wav";

function isAccepted(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp3") || name.endsWith(".wav")) return true;
  return ACCEPTED.includes(file.type);
}

function normalizedType(file: File): string {
  if (ACCEPTED.includes(file.type)) return file.type;
  if (file.name.toLowerCase().endsWith(".wav")) return "audio/wav";
  return "audio/mpeg";
}

interface Props {
  submissionId: string;
  initialUrl?: string | null;
  onUploaded?: (url: string) => void;
}

export function AudioUploader({ submissionId, initialUrl, onUploaded }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files[0]) return;
    const f = files[0];
    if (!isAccepted(f)) {
      toast.error("Only MP3 or WAV files are accepted.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File is too large. Max 50MB.");
      return;
    }
    setFile(f);
    await upload(f);
  }

  async function upload(f: File) {
    setUploading(true);
    setProgress(5);
    try {
      const ext = f.name.toLowerCase().endsWith(".wav") ? "wav" : "mp3";
      const path = `artists/${submissionId}/songs/${Date.now()}.${ext}`;

      // Fake progress while supabase-js uploads (no native progress events).
      const tick = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 5 : p));
      }, 250);

      const { error: upErr } = await supabase.storage
        .from("artist-audio")
        .upload(path, f, {
          contentType: normalizedType(f),
          upsert: false,
          cacheControl: "3600",
        });
      clearInterval(tick);
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from("artist-audio").getPublicUrl(path);
      const url = pub.publicUrl;
      setProgress(95);

      await attachAudioToSubmission({
        data: { submissionId, audioUrl: url, audioFileType: normalizedType(f) },
      });

      setProgress(100);
      setUploadedUrl(url);
      onUploaded?.(url);
      toast.success("Track uploaded. It's now attached to your live review submission.");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
      setProgress(0);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setProgress(0);
    setUploadedUrl(null);
  }

  return (
    <div className="space-y-3 text-left">
      {!uploadedUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed p-6 md:p-8 text-center cursor-pointer transition-all bg-black/40",
            uploading && "pointer-events-none opacity-80",
          )}
          style={{
            borderColor: dragOver ? RED : `${RED}55`,
            boxShadow: dragOver ? `0 0 24px ${RED}55` : undefined,
          }}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          {uploading ? (
            <Loader2 className="w-8 h-8 mx-auto animate-spin" style={{ color: RED }} />
          ) : (
            <UploadCloud className="w-8 h-8 mx-auto" style={{ color: RED }} />
          )}
          <div className="mt-3 font-anton uppercase tracking-wide text-bone text-sm">
            {uploading ? "Uploading…" : "Drop your track here"}
          </div>
          <div className="mt-1 text-xs text-bone/60">
            MP3 or WAV · max 50MB · tap to browse
          </div>
          {file && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-bone/80">
              <Music className="w-3.5 h-3.5" /> {file.name}
            </div>
          )}
          {uploading && (
            <div className="mt-4 h-1.5 w-full bg-white/10 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${progress}%`, background: RED }}
              />
            </div>
          )}
        </div>
      ) : (
        <div
          className="border bg-black/40 p-4 space-y-3"
          style={{ borderColor: `${RED}55` }}
        >
          <div className="flex items-center gap-2 text-bone">
            <CheckCircle2 className="w-4 h-4" style={{ color: RED }} />
            <span className="font-anton uppercase tracking-wide text-sm">
              Track attached
            </span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-bone/50 hover:text-bone"
              aria-label="Upload a different file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <AudioPlayer src={uploadedUrl} />
        </div>
      )}
    </div>
  );
}

export function AudioPlayer({ src }: { src: string }) {
  return (
    <audio
      controls
      preload="metadata"
      src={src}
      className="w-full"
      style={{ colorScheme: "dark" }}
    >
      Your browser does not support the audio element.
    </audio>
  );
}