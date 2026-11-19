import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signPublicVideoPaths, signVideoPaths } from "@/lib/video-sign.functions";

const cache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string | null>>();
const waiting = new Map<string, (url: string | null) => void>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

async function flushVideoPaths() {
  const entries = [...waiting.entries()];
  waiting.clear();
  batchTimer = null;
  try {
    const { data: session } = await supabase.auth.getSession();
    // Both existing endpoints accept at most 50 paths. Keep their authorization intact.
    await Promise.all(Array.from({ length: Math.ceil(entries.length / 50) }, async (_, index) => {
      const group = entries.slice(index * 50, (index + 1) * 50);
      try {
        const paths = group.map(([path]) => path);
        const response = session.session
          ? await signVideoPaths({ data: { paths } })
          : await signPublicVideoPaths({ data: { paths } });
        for (const [path, resolve] of group) {
          const url = response.results[path] ?? null;
          if (url) cache.set(path, { url, expiresAt: Date.now() + 3600_000 });
          resolve(url);
        }
      } catch {
        for (const [, resolve] of group) resolve(null);
      }
    }));
  } catch {
    for (const [, resolve] of entries) resolve(null);
  }
}

/** Sign a path in the private `videos` bucket (1h, cached in memory). */
export async function signVideoPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit && hit.expiresAt - 60_000 > Date.now()) return hit.url;
  const pending = inflight.get(path);
  if (pending) return pending;
  const p = new Promise<string | null>((resolve) => {
    waiting.set(path, resolve);
    if (!batchTimer) batchTimer = setTimeout(() => void flushVideoPaths(), 25);
  }).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/** React hook returning a signed URL for a path in the `videos` bucket. */
export function useSignedVideoUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!path) return null;
    const hit = cache.get(path);
    return hit && hit.expiresAt - 60_000 > Date.now() ? hit.url : null;
  });

  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    const hit = cache.get(path);
    if (hit && hit.expiresAt - 60_000 > Date.now()) { setUrl(hit.url); return; }
    setUrl(null);
    void signVideoPath(path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path]);

  return url;
}
