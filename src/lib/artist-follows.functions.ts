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

export const listArtistFollowers = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        artistId: z.string().uuid(),
        page: z.number().int().min(1).max(10_000).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: rows, count, error } = await sb
      .from("artist_follows")
      .select("follower_id, created_at", { count: "exact" })
      .eq("artist_id", data.artistId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const ids = (rows ?? []).map((r) => r.follower_id as string);
    let profilesById = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
    if (ids.length > 0) {
      const { data: profs } = await sb
        .from("public_profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      profilesById = new Map(
        (profs ?? [])
          .filter((p): p is { id: string; display_name: string | null; avatar_url: string | null } => !!p.id)
          .map((p) => [p.id, { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }

    const followers = (rows ?? []).map((r) => {
      const p = profilesById.get(r.follower_id as string);
      return {
        id: r.follower_id as string,
        followedAt: r.created_at as string,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      };
    });

    const total = count ?? 0;
    return {
      followers,
      total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.max(1, Math.ceil(total / data.pageSize)),
    };
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