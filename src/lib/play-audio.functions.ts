import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Returns a long-lived signed URL for a freshly uploaded play track file.
 *  The caller must own the path (play/<userId>/...). */
export const signPlayAudioUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ path: z.string().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const parts = data.path.split("/");
    if (parts[0] !== "play" || parts[1] !== userId) {
      throw new Error("Forbidden: path does not belong to caller");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // 1 year expiry
    const { data: signed, error } = await supabaseAdmin
      .storage.from("artist-audio")
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);
    if (error || !signed) throw new Error(error?.message ?? "Failed to sign URL");
    return { url: signed.signedUrl };
  });