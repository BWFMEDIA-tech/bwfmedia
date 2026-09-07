import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Music4, Upload, X, CheckCircle2 } from "lucide-react";
import {
  AUDIO_ACCEPT, IMAGE_ACCEPT, ARTWORK_IDEAL_PX,
  formatBytes, formatDuration, readAudioDuration,
  signDistributionAsset, uploadDistributionFile,
  validateArtworkFile, validateAudioFile,
} from "@/lib/distribution-upload";

/** Resolve a stored distribution asset reference into a usable URL. */
export function useDistributionAsset(ref: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!ref) return;
    signDistributionAsset(ref).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => { cancelled = true; };
  }, [ref]);
  return url;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg,#00E6FF,#C53DFF)" }}
      />
    </div>
  );
}

/** Square cover-art uploader with live preview, validation and upload progress. */
export function ArtworkUploader({
  userId, value, onChange, disabled,
}: {
  userId: string;
  value: string | null;
  onChange: (ref: string | null) => void;
  disabled?: boolean;
}) {
  const existing = useDistributionAsset(value);
  const [preview, setPreview] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handle(file: File | null) {
    if (!file) return;
    try {
      const check = await validateArtworkFile(file);
      setPreview(URL.createObjectURL(file));
      setMeta(`${check.width}×${check.height} · ${formatBytes(file.size)}`);
      if (check.warning) toast.warning(check.warning);
      setPct(0);
      const ref = await uploadDistributionFile(userId, file, "artwork", setPct);
      onChange(ref);
      toast.success("Artwork uploaded");
    } catch (e: any) {
      setPreview(null);
      toast.error(e?.message ?? "Artwork upload failed");
    } finally {
      setPct(null);
    }
  }

  const shown = preview ?? existing;

  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-[#00E6FF]/40 bg-[#00E6FF]/5 text-[#00E6FF] hover:bg-[#00E6FF]/10 disabled:opacity-50"
          aria-label="Upload cover artwork"
        >
          {shown ? (
            <img src={shown} alt="Cover artwork preview" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/60">
            Square JPG or PNG, {ARTWORK_IDEAL_PX}×{ARTWORK_IDEAL_PX} recommended.
          </div>
          {meta && <div className="mt-1 text-[11px] text-white/40">{meta}</div>}
          {pct !== null && <ProgressBar pct={pct} />}
          {shown && pct === null && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold text-white/75 hover:bg-white/5"
              >
                Replace
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => { setPreview(null); setMeta(null); onChange(null); }}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-white/50 hover:text-red-300"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => { handle(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
    </div>
  );
}

/** Master audio uploader: validates format/size, reads duration, reports progress. */
export function AudioUploader({
  userId, value, durationSecs, onUploaded, disabled, compact,
}: {
  userId: string;
  value: string | null;
  durationSecs?: number | null;
  onUploaded: (payload: { ref: string; durationSecs: number | null; fileName: string }) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}) {
  const url = useDistributionAsset(value);
  const [pct, setPct] = useState<number | null>(null);
  const [name, setName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handle(file: File | null) {
    if (!file) return;
    try {
      const { warning } = validateAudioFile(file);
      if (warning) toast.warning(warning);
      setName(`${file.name} · ${formatBytes(file.size)}`);
      setPct(0);
      const [ref, dur] = await Promise.all([
        uploadDistributionFile(userId, file, "audio", setPct),
        readAudioDuration(file),
      ]);
      await onUploaded({ ref, durationSecs: dur, fileName: file.name });
      toast.success("Master audio uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Audio upload failed");
    } finally {
      setPct(null);
    }
  }

  return (
    <div className={compact ? "" : "rounded-xl border border-white/10 bg-white/[0.02] p-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || pct !== null}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#00E6FF] px-4 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
        >
          <Upload className="h-3 w-3" /> {value ? "Replace master" : "Upload master audio"}
        </button>
        {value && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Master attached
            {durationSecs ? ` · ${formatDuration(durationSecs)}` : ""}
          </span>
        )}
        {!value && (
          <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
            <Music4 className="h-3 w-3" /> WAV / FLAC preferred
          </span>
        )}
      </div>
      {name && <div className="mt-1 truncate text-[11px] text-white/40">{name}</div>}
      {pct !== null && <ProgressBar pct={pct} />}
      {url && pct === null && (
        <audio src={url} controls preload="none" className="mt-2 h-8 w-full max-w-md" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={(e) => { handle(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
    </div>
  );
}

/** Small square cover thumbnail for release rows. */
export function ArtworkThumb({ value, className }: { value: string | null | undefined; className?: string }) {
  const url = useDistributionAsset(value);
  if (!url) return null;
  return <img src={url} alt="" className={className ?? "h-12 w-12 rounded-lg object-cover"} />;
}
