import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string | null>>();

/** Sign a path in the private `videos` bucket (1h, cached in memory). */
export async function signVideoPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit && hit.expiresAt - 60_000 > Date.now()) return hit.url;
  const pending = inflight.get(path);
  if (pending) return pending;
  const p = (async () => {
    const { data, error } = await supabase.storage.from("videos").createSignedUrl(path, 3600);
    inflight.delete(path);
    if (error || !data?.signedUrl) return null;
    cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 3600_000 });
    return data.signedUrl;
  })();
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
