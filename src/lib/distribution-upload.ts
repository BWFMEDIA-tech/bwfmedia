import { supabase } from "@/integrations/supabase/client";

export const DISTRIBUTION_BUCKET = "distribution-assets";
export const ASSET_PREFIX = `${DISTRIBUTION_BUCKET}:`;

/** Accepted master audio formats (lossless preferred). */
export const AUDIO_ACCEPT = ".wav,.flac,.aiff,.aif,.mp3,.m4a,audio/*";
export const AUDIO_MAX_BYTES = 400 * 1024 * 1024; // 400MB
const AUDIO_EXTS = ["wav", "flac", "aiff", "aif", "mp3", "m4a"];
export const LOSSLESS_EXTS = ["wav", "flac", "aiff", "aif"];

/** Accepted cover artwork formats. */
export const IMAGE_ACCEPT = "image/jpeg,image/png";
export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
export const ARTWORK_MIN_PX = 1400;
export const ARTWORK_IDEAL_PX = 3000;

export type UploadProgress = (pct: number) => void;

function ext(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isAssetRef(v: unknown): v is string {
  return typeof v === "string" && v.startsWith(ASSET_PREFIX);
}

export function refToPath(ref: string): string {
  return ref.startsWith(ASSET_PREFIX) ? ref.slice(ASSET_PREFIX.length) : ref;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDuration(secs: number | null | undefined): string {
  if (!secs && secs !== 0) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Validate a master audio file. Returns a warning string (non-blocking) or throws on hard failure. */
export function validateAudioFile(file: File): { warning: string | null } {
  const e = ext(file.name);
  if (!AUDIO_EXTS.includes(e)) {
    throw new Error(`Unsupported audio format “.${e}”. Use WAV, FLAC, AIFF, MP3 or M4A.`);
  }
  if (file.size > AUDIO_MAX_BYTES) {
    throw new Error(`Audio file is ${formatBytes(file.size)} — the limit is ${formatBytes(AUDIO_MAX_BYTES)}.`);
  }
  if (file.size === 0) throw new Error("That audio file is empty.");
  return {
    warning: LOSSLESS_EXTS.includes(e)
      ? null
      : "Compressed master detected — a WAV or FLAC master is strongly recommended.",
  };
}

/** Read audio duration in seconds from a local file (best effort). */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const el = document.createElement("audio");
      el.preload = "metadata";
      const done = (v: number | null) => {
        URL.revokeObjectURL(url);
        resolve(v);
      };
      el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? Math.round(el.duration) : null);
      el.onerror = () => done(null);
      el.src = url;
      setTimeout(() => done(null), 15000);
    } catch {
      resolve(null);
    }
  });
}

export type ArtworkCheck = { width: number; height: number; warning: string | null };

/** Validate cover artwork: format, size, square, minimum resolution. */
export function validateArtworkFile(file: File): Promise<ArtworkCheck> {
  return new Promise((resolve, reject) => {
    const e = ext(file.name);
    if (!["jpg", "jpeg", "png"].includes(e)) {
      reject(new Error("Artwork must be a JPG or PNG file."));
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      reject(new Error(`Artwork is ${formatBytes(file.size)} — the limit is ${formatBytes(IMAGE_MAX_BYTES)}.`));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      URL.revokeObjectURL(url);
      if (width !== height) {
        reject(new Error(`Artwork must be square — this image is ${width}×${height}.`));
        return;
      }
      if (width < ARTWORK_MIN_PX) {
        reject(new Error(`Artwork must be at least ${ARTWORK_MIN_PX}×${ARTWORK_MIN_PX}px — this is ${width}×${height}.`));
        return;
      }
      resolve({
        width,
        height,
        warning:
          width < ARTWORK_IDEAL_PX
            ? `${width}×${height} works, but ${ARTWORK_IDEAL_PX}×${ARTWORK_IDEAL_PX} is recommended for best quality.`
            : null,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be read."));
    };
    img.src = url;
  });
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/**
 * Upload a file to the private distribution bucket under the caller's own
 * folder, reporting real byte progress. Returns the stored asset reference.
 */
export async function uploadDistributionFile(
  userId: string,
  file: File,
  folder: "artwork" | "audio",
  onProgress?: UploadProgress,
): Promise<string> {
  const path = `${userId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (baseUrl && token && typeof XMLHttpRequest !== "undefined") {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${baseUrl}/storage/v1/object/${DISTRIBUTION_BUCKET}/${path}`);
      xhr.setRequestHeader("authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      if (file.type) xhr.setRequestHeader("content-type", file.type);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed (${xhr.status}). ${xhr.responseText?.slice(0, 160) ?? ""}`));
      };
      xhr.onerror = () => reject(new Error("Upload failed — check your connection and try again."));
      xhr.send(file);
    });
  } else {
    const { error } = await supabase.storage.from(DISTRIBUTION_BUCKET).upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
  }

  onProgress?.(100);
  return `${ASSET_PREFIX}${path}`;
}

const signedCache = new Map<string, { url: string; expiresAt: number }>();

/** Resolve a stored asset reference into a short-lived signed URL. */
export async function signDistributionAsset(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (!isAssetRef(ref)) return ref;
  const hit = signedCache.get(ref);
  if (hit && hit.expiresAt - 60_000 > Date.now()) return hit.url;
  const { data, error } = await supabase.storage
    .from(DISTRIBUTION_BUCKET)
    .createSignedUrl(refToPath(ref), 3600);
  if (error || !data?.signedUrl) return null;
  signedCache.set(ref, { url: data.signedUrl, expiresAt: Date.now() + 3600_000 });
  return data.signedUrl;
}
