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
      const { data: rows } = await context.supabase
        .from("videos")
        .select("storage_path, thumbnail_path")
        .or(`storage_path.in.(${others.map((p) => `"${p.replace(/"/g, "")}"`).join(",")}),thumbnail_path.in.(${others.map((p) => `"${p.replace(/"/g, "")}"`).join(",")})`);
      for (const r of (rows ?? []) as Array<{ storage_path: string | null; thumbnail_path: string | null }>) {
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
