import { useEffect, useState } from "react";
import { signAvatarUrls } from "@/lib/signed-avatar.functions";

type CacheEntry = { url: string; expiresAt: number };
type PendingEntry = Promise<string | null>;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, PendingEntry>();

const TTL_SECONDS = 3600;
// Refresh ~5 min before expiry to avoid 403 on long-lived UIs.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const PUBLIC_AVATAR_MARKER = "/storage/v1/object/public/avatars/";
const BATCH_WINDOW_MS = 25;

let batchQueue: string[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const batchResolvers = new Map<string, ((v: string | null) => void)[]>();

function flushBatch() {
  const urls = Array.from(new Set(batchQueue));
  batchQueue = [];
  batchTimer = null;
  const resolvers = new Map(batchResolvers);
  batchResolvers.clear();
  if (urls.length === 0) return;
  signAvatarUrls({ data: { urls, expiresIn: TTL_SECONDS } })
    .then((res) => {
      const now = Date.now();
      const expiresIn = res?.expiresIn ?? TTL_SECONDS;
      for (const [url, fns] of resolvers.entries()) {
        const signed = res?.results?.[url] ?? null;
        if (signed) {
          cache.set(cacheKey(url), { url: signed, expiresAt: now + expiresIn * 1000 });
        }
        for (const fn of fns) fn(signed);
      }
    })
    .catch(() => {
      for (const fns of resolvers.values()) for (const fn of fns) fn(null);
    });
}

function isPrivateAvatarUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.includes(PUBLIC_AVATAR_MARKER);
}

function cacheKey(url: string): string {
  // Drop cache-busting query params (e.g. `?v=...`) so the same object reuses
  // one signed URL across renders.
  return url.split("?")[0];
}

async function fetchSigned(originalUrl: string): Promise<string | null> {
  const key = cacheKey(originalUrl);
  const existing = cache.get(key);
  const now = Date.now();
  if (existing && existing.expiresAt - REFRESH_BUFFER_MS > now) return existing.url;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    batchQueue.push(originalUrl);
    const arr = batchResolvers.get(originalUrl) ?? [];
    arr.push(resolve);
    batchResolvers.set(originalUrl, arr);
    if (!batchTimer) batchTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
  }).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/**
 * Resolve a profile avatar URL to a renderable URL.
 * - Private `/storage/v1/object/public/avatars/...` URLs are exchanged for a
 *   short-lived signed URL (cached in-memory).
 * - Any other URL (Google OAuth pic, external CDN, etc.) is returned as-is.
 * - Falsy input returns `undefined` so callers can render their fallback.
 */
export function useSignedAvatarUrl(
  url: string | null | undefined,
): string | undefined {
  const isPrivate = isPrivateAvatarUrl(url);
  const cached = isPrivate ? cache.get(cacheKey(url!)) : null;
  const initial = isPrivate
    ? cached && cached.expiresAt - REFRESH_BUFFER_MS > Date.now()
      ? cached.url
      : undefined
    : (url ?? undefined);

  const [resolved, setResolved] = useState<string | undefined>(initial);

  useEffect(() => {
    if (!url) {
      setResolved(undefined);
      return;
    }
    if (!isPrivateAvatarUrl(url)) {
      setResolved(url);
      return;
    }
    let cancelled = false;
    const key = cacheKey(url);
    const hit = cache.get(key);
    if (hit && hit.expiresAt - REFRESH_BUFFER_MS > Date.now()) {
      setResolved(hit.url);
      return;
    }
    setResolved(undefined);
    fetchSigned(url).then((signed) => {
      if (!cancelled) setResolved(signed ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolved;
}