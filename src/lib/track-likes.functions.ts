import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyTrackLikes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ trackIds: z.array(z.string()).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.trackIds.length === 0) return { liked: [] as string[] };
    const { data: rows, error } = await context.supabase
      .from("track_likes")
      .select("track_id")
      .eq("user_id", context.userId)
      .in("track_id", data.trackIds);
    if (error) throw error;
    return { liked: (rows ?? []).map((r) => r.track_id as string) };
  });

export const toggleTrackLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ trackId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await context.supabase
      .from("track_likes")
      .select("track_id")
      .eq("user_id", context.userId)
      .eq("track_id", data.trackId)
      .maybeSingle();

    let liked: boolean;
    if (existing) {
      const { error } = await context.supabase
        .from("track_likes")
        .delete()
        .eq("user_id", context.userId)
        .eq("track_id", data.trackId);
      if (error) throw error;
      liked = false;
    } else {
      const { error } = await context.supabase
        .from("track_likes")
        .insert({ user_id: context.userId, track_id: data.trackId });
      if (error) throw error;
      liked = true;
    }

    // Recount and persist denormalised like_count on play_tracks (admin bypasses RLS).
    const { count } = await supabaseAdmin
      .from("track_likes")
      .select("track_id", { count: "exact", head: true })
      .eq("track_id", data.trackId);
    const likeCount = count ?? 0;
    await supabaseAdmin
      .from("play_tracks")
      .update({ like_count: likeCount })
      .eq("id", data.trackId);

    return { liked, like_count: likeCount };
  });