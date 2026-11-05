import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Signs files in the private `videos` bucket for signed-in viewers.
 * Only paths that belong to a published video row (or the caller's own
 * folder) can be signed, so arbitrary bucket files are never exposed.
 */
export const signVideoPaths = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ paths: z.array(z.string().min(1).max(500)).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const paths = Array.from(new Set(data.paths));
    const own = paths.filter((p) => p.startsWith(`${context.userId}/`));
    const others = paths.filter((p) => !own.includes(p));
    const allowed = new Set<string>(own);
    if (others.length) {
      const [a, b] = await Promise.all([
        context.supabase.from("videos").select("storage_path, thumbnail_path").in("storage_path", others),
        context.supabase.from("videos").select("storage_path, thumbnail_path").in("thumbnail_path", others),
      ]);
      const rows = [...(a.data ?? []), ...(b.data ?? [])];
      for (const r of rows as Array<{ storage_path: string | null; thumbnail_path: string | null }>) {
        if (r.storage_path) allowed.add(r.storage_path);
        if (r.thumbnail_path) allowed.add(r.thumbnail_path);
      }
    }
    const toSign = paths.filter((p) => allowed.has(p));
    const results: Record<string, string | null> = {};
    for (const p of paths) results[p] = null;
    if (!toSign.length) return { results };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from("videos").createSignedUrls(toSign, 3600);
    for (const s of signed ?? []) if (s.path) results[s.path] = s.signedUrl ?? null;
    return { results };
  });

/**
 * Public variant for signed-out visitors: signs only paths that belong to a
 * published video row, so arbitrary bucket files are never exposed.
 */
export const signPublicVideoPaths = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ paths: z.array(z.string().min(1).max(500)).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    const paths = Array.from(new Set(data.paths));
    const results: Record<string, string | null> = {};
    for (const p of paths) results[p] = null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Parameterised .in() filters: path strings can never inject filter syntax.
    const [a, b] = await Promise.all([
      supabaseAdmin.from("videos").select("storage_path, thumbnail_path").in("storage_path", paths),
      supabaseAdmin.from("videos").select("storage_path, thumbnail_path").in("thumbnail_path", paths),
    ]);
    const rows = [...(a.data ?? []), ...(b.data ?? [])];
    const allowed = new Set<string>();
    for (const r of (rows ?? []) as Array<{ storage_path: string | null; thumbnail_path: string | null }>) {
      if (r.storage_path) allowed.add(r.storage_path);
      if (r.thumbnail_path) allowed.add(r.thumbnail_path);
    }
    const toSign = paths.filter((p) => allowed.has(p));
    if (!toSign.length) return { results };
    const { data: signed } = await supabaseAdmin.storage.from("videos").createSignedUrls(toSign, 3600);
    for (const s of signed ?? []) if (s.path) results[s.path] = s.signedUrl ?? null;
    return { results };
  });
