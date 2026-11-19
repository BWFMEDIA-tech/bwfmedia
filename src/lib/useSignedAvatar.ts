import { useEffect, useState } from "react";
import { signAvatarUrls, signQueuedArtworkUrls } from "@/lib/signed-avatar.functions";
import { avatarObjectPath } from "@/lib/public-artwork";

type CacheEntry = { url: string; expiresAt: number };
type PendingEntry = Promise<string | null>;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, PendingEntry>();

// Long-lived links keep the same URL across visits so the browser reuses its saved copy.
const TTL_SECONDS = 60 * 60 * 24;
const STORE_KEY = "tunevio:signed-img:v2";
function loadStore() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const now = Date.now();
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, CacheEntry>)) {
      if (v && typeof v.url === "string" && v.expiresAt - REFRESH_BUFFER_MS > now) cache.set(k, v);
    }
  } catch { /* ignore corrupt storage */ }
}
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveStore() {
  if (typeof window === "undefined" || saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const now = Date.now();
      const entries = [...cache.entries()].filter(([, v]) => v.expiresAt > now).slice(-400);
      window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch { /* storage full or blocked */ }
  }, 500);
}
// Refresh ~5 min before expiry to avoid 403 on long-lived UIs.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const BATCH_WINDOW_MS = 25;

type Batch = { queue: string[]; timer: ReturnType<typeof setTimeout> | null; resolvers: Map<string, ((v: string | null) => void)[]> };
const batches = new Map<number, Batch>();
let storeLoaded = false;
function ensureStore() { if (!storeLoaded) { storeLoaded = true; loadStore(); } }

function flushBatch(width: number) {
  const b = batches.get(width);
  if (!b) return;
  batches.delete(width);
  const urls = Array.from(new Set(b.queue));
  const resolvers = b.resolvers;
  const cacheKey = (u: string) => keyFor(u, width);
  if (urls.length === 0) return;
  signAvatarUrls({ data: { urls, expiresIn: TTL_SECONDS, width: width || undefined } })
    .then(async (res) => {
      const now = Date.now();
      const expiresIn = res?.expiresIn ?? TTL_SECONDS;
      // Unrelated private queue fallbacks must not delay authorized public photos.
      for (const [url, fns] of resolvers.entries()) {
        const signed = res?.results?.[url];
        if (!signed) continue;
        cache.set(cacheKey(url), { url: signed, expiresAt: now + expiresIn * 1000 });
        saveStore();
        for (const fn of fns) fn(signed);
      }
      const missing = urls.filter((url) => !res?.results?.[url]);
      const queued = missing.length
        ? await signQueuedArtworkUrls({ data: { urls: missing } }).catch(() => null)
        : null;
      for (const [url, fns] of resolvers.entries()) {
        const publicSigned = res?.results?.[url];
        if (publicSigned) continue;
        const signed = queued?.results?.[url] ?? null;
        if (signed) {
          cache.set(cacheKey(url), { url: signed, expiresAt: Date.now() + 600 * 1000 });
        }
        for (const fn of fns) fn(signed);
      }
    })
    .catch(() => {
      for (const fns of resolvers.values()) for (const fn of fns) fn(null);
    });
}

function isPrivateAvatarUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && avatarObjectPath(url) !== null;
}

function keyFor(url: string, width: number): string {
  // Keep the version query (`?v=...`) so a replaced photo gets a fresh link.
  const base = avatarObjectPath(url) ?? url.split("?")[0];
  const v = url.match(/[?&]v=([^&]+)/)?.[1];
  return `${base}${v ? `@${v}` : ""}#${width}`;
}

/** Display widths are bucketed so nearby sizes share one cached copy. */
export function imageWidthBucket(width?: number): number {
  if (!width || width <= 0) return 0;
  for (const w of [160, 320, 480, 640, 960, 1280]) if (width <= w) return w;
  return 0;
}

async function fetchSigned(originalUrl: string, width = 0): Promise<string | null> {
  ensureStore();
  const key = keyFor(originalUrl, width);
  const existing = cache.get(key);
  const now = Date.now();
  if (existing && existing.expiresAt - REFRESH_BUFFER_MS > now) return existing.url;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    let b = batches.get(width);
    if (!b) { b = { queue: [], timer: null, resolvers: new Map() }; batches.set(width, b); }
    b.queue.push(originalUrl);
    const arr = b.resolvers.get(originalUrl) ?? [];
    arr.push(resolve);
    b.resolvers.set(originalUrl, arr);
    if (!b.timer) b.timer = setTimeout(() => flushBatch(width), BATCH_WINDOW_MS);
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
/** Sign and warm the browser cache ahead of display (e.g. Arena Side A/B). */
export function preloadSignedImage(url: string | null | undefined, width = 0): void {
  if (typeof window === "undefined" || !url) return;
  const go = (u: string | null) => { if (u) { const img = new Image(); img.decoding = "async"; img.src = u; } };
  if (!isPrivateAvatarUrl(url)) return go(url);
  void fetchSigned(url, imageWidthBucket(width)).then(go);
}

export function useSignedAvatarUrl(
  url: string | null | undefined,
  displayWidth?: number,
): string | undefined {
  const width = imageWidthBucket(displayWidth);
  const cacheKey = (u: string) => keyFor(u, width);
  const isPrivate = isPrivateAvatarUrl(url);
  const cached = isPrivate ? cache.get(cacheKey(url)) : null;
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
    fetchSigned(url, width).then((signed) => {
      if (!cancelled) setResolved(signed ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [url, width]);

  return resolved;
}