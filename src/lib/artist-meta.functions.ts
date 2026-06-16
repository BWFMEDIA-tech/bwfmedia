import { createServerFn } from "@tanstack/react-start";

export const getArtistMeta = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb: any = supabaseAdmin;
    const id = data.id;
    try {
      const [profileRes, queueRes, tracksRes, videosRes, streamsRes] = await Promise.all([
        sb.from("profiles")
          .select("display_name, stage_name, avatar_url, banner_url, bio, location, genre, genres, member_since, created_at")
          .eq("id", id).maybeSingle(),
        sb.from("live_queue_public").select("artist_name, photo_url").eq("id", id).maybeSingle(),
        sb.from("play_tracks").select("like_count, dislike_count").eq("artist_user_id", id),
        sb.from("videos").select("id", { count: "exact", head: true }).eq("user_id", id),
        sb.from("streams").select("id").eq("host_id", id),
      ]);

      const p = profileRes.data ?? {};
      const q = queueRes.data ?? {};
      const tracks = (tracksRes.data ?? []) as Array<{ like_count: number; dislike_count: number }>;
      const streamIds = ((streamsRes.data ?? []) as Array<{ id: string }>).map((s) => s.id);

      let tipsCents = 0;
      if (streamIds.length) {
        const { data: tipsRows } = await sb
          .from("tips").select("amount_cents")
          .in("stream_id", streamIds).eq("status", "paid");
        tipsCents = (tipsRows ?? []).reduce(
          (acc: number, r: { amount_cents: number }) => acc + (r.amount_cents ?? 0), 0,
        );
      }

      const songCount = tracks.length;
      const likeCount = tracks.reduce((a, r) => a + (r.like_count ?? 0), 0);
      const genres: string[] = Array.isArray(p.genres) ? p.genres : [];
      const genre = (p.genre as string | null) ?? (genres[0] ?? null);

      return {
        name: (p.stage_name as string | null) ?? (p.display_name as string | null) ?? (q.artist_name as string | null) ?? null,
        photo: (p.avatar_url as string | null) ?? (q.photo_url as string | null) ?? null,
        banner: (p.banner_url as string | null) ?? null,
        bio: (p.bio as string | null) ?? null,
        location: (p.location as string | null) ?? null,
        genre,
        memberSince: (p.member_since as string | null) ?? (p.created_at as string | null) ?? null,
        stats: {
          songs: songCount,
          videos: videosRes.count ?? 0,
          likes: likeCount,
          tipsCents,
        },
      };
    } catch {
      return {
        name: null as string | null, photo: null as string | null,
        banner: null as string | null, bio: null as string | null,
        location: null as string | null, genre: null as string | null,
        memberSince: null as string | null,
        stats: { songs: 0, videos: 0, likes: 0, tipsCents: 0 },
      };
    }
  });