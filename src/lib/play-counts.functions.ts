import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const incrementTrackPlayCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ trackId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: count, error } = await context.supabase.rpc(
      "increment_track_play_count",
      { _track_id: data.trackId },
    );
    if (error) throw error;
    return { play_count: (count as number | null) ?? 0 };
  });