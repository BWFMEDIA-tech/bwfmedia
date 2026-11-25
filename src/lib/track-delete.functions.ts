import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "artist-audio";

function storagePath(url: string | null): string | null {
  if (!url) return null;
  for (const m of [`/object/public/${BUCKET}/`, `/object/sign/${BUCKET}/`]) {
    const i = url.indexOf(m);
    if (i !== -1) return decodeURIComponent(url.slice(i + m.length).split("?")[0] ?? "");
  }
  return url.startsWith("http") ? null : url.replace(/^\/+/, "");
}

/** Delete the caller's own tracks, then remove audio files no other track uses,
 *  so previously issued playback links stop working immediately. */
export const deleteMyTracks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("play_tracks").delete()
      .in("id", data.ids).eq("artist_user_id", context.userId)
      .select("id, audio_url");
    if (error) throw new Error("Could not delete tracks");
    const paths = [...new Set((rows ?? []).map((r) => storagePath(r.audio_url)).filter(
      (p): p is string => !!p && p.startsWith(`${context.userId}/`)))];
    if (paths.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const orphaned: string[] = [];
      for (const p of paths) {
        const { count } = await supabaseAdmin.from("play_tracks")
          .select("id", { count: "exact", head: true }).like("audio_url", `%${p}%`);
        if (!count) orphaned.push(p);
      }
      if (orphaned.length) await supabaseAdmin.storage.from(BUCKET).remove(orphaned);
    }
    return { deleted: (rows ?? []).map((r) => r.id) };
  });
