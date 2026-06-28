import { useEffect, useState } from "react";
import { signAudioUrl } from "@/lib/signed-audio.functions";

type CacheEntry = { url: string; expiresAt: number };
type ResolvedState = { source: string | null; url: string | undefined };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();
const TTL_SECONDS = 3600;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const PUBLIC_MARKER = "/storage/v1/object/public/artist-audio/";
const SIGNED_MARKER = "/storage/v1/object/sign/artist-audio/";

function isPrivateAudioUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && (url.includes(PUBLIC_MARKER) || url.includes(SIGNED_MARKER));
}

function cacheKey(url: string): string {
  return url.split("?")[0];
}

export async function getSignedAudioUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!isPrivateAudioUrl(url)) return url;
  const key = cacheKey(url);
  const existing = cache.get(key);
  const now = Date.now();
  if (existing && existing.expiresAt - REFRESH_BUFFER_MS > now) return existing.url;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = signAudioUrl({ data: { url, expiresIn: TTL_SECONDS } })
    .then((res) => {
      const signed = res?.url ?? null;
      const expiresIn = res?.expiresIn ?? TTL_SECONDS;
      if (signed) cache.set(key, { url: signed, expiresAt: Date.now() + expiresIn * 1000 });
      return signed;
    })
    .catch(() => null)
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Resolve an audio URL: re-signs `artist-audio` URLs, passes everything else through. */
export function useSignedAudioUrl(url: string | null | undefined): string | undefined {
  const isPrivate = isPrivateAudioUrl(url);
  const cached = isPrivate ? cache.get(cacheKey(url!)) : null;
  const initial = isPrivate
    ? cached && cached.expiresAt - REFRESH_BUFFER_MS > Date.now()
      ? cached.url
      : undefined
    : (url ?? undefined);
  const [resolved, setResolved] = useState<ResolvedState>({ source: url ?? null, url: initial });

  useEffect(() => {
    if (!url) { setResolved({ source: null, url: undefined }); return; }
    if (!isPrivateAudioUrl(url)) { setResolved({ source: url, url }); return; }
    let cancelled = false;
    const hit = cache.get(cacheKey(url));
    if (hit && hit.expiresAt - REFRESH_BUFFER_MS > Date.now()) {
      setResolved({ source: url, url: hit.url });
      return;
    }
    setResolved({ source: url, url: undefined });
    getSignedAudioUrl(url).then((s) => {
      if (!cancelled) setResolved({ source: url, url: s ?? undefined });
    });
    return () => { cancelled = true; };
  }, [url]);

  return resolved.source === (url ?? null) ? resolved.url : undefined;
}