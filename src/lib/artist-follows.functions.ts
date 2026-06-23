import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getArtistFollowStats = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ artistId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { count } = await sb
      .from("artist_follows")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", data.artistId);
    return { count: count ?? 0 };
  });

export const getIsFollowingArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ artistId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("artist_follows")
      .select("id")
      .eq("artist_id", data.artistId)
      .eq("follower_id", context.userId)
      .maybeSingle();
    return { following: !!row };
  });

export const toggleArtistFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ artistId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.artistId === context.userId) {
      throw new Error("You cannot follow yourself");
    }
    const { data: existing } = await context.supabase
      .from("artist_follows")
      .select("id")
      .eq("artist_id", data.artistId)
      .eq("follower_id", context.userId)
      .maybeSingle();

    let following: boolean;
    if (existing) {
      const { error } = await context.supabase
        .from("artist_follows")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      following = false;
    } else {
      const { error } = await context.supabase
        .from("artist_follows")
        .insert({ artist_id: data.artistId, follower_id: context.userId });
      if (error) throw error;
      following = true;
    }

    const sb = publicClient();
    const { count } = await sb
      .from("artist_follows")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", data.artistId);

    return { following, count: count ?? 0 };
  });