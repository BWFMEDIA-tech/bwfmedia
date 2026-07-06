// @auth-exempt: public read of non-sensitive track data.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ChartTab = "top_rated" | "trending" | "most_played" | "most_liked" | "fresh_reviews";

export type ChartTrack = {
  id: string;
  title: string;
  artistName: string;
  artistUserId: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  playCount: number;
  likeCount: number;
  dislikeCount: number;
  score: number;
  rating: number; // 0..5
  ratingCount: number;
  createdAt: string;
};

export const getCharts = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        tab: z
          .enum(["top_rated", "trending", "most_played", "most_liked", "fresh_reviews"])
          .default("top_rated"),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<ChartTrack[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    let q = sb
      .from("play_tracks")
      .select(
        "id, title, artist_name, artist_user_id, cover_url, audio_url, duration_seconds, play_count, like_count, dislike_count, score, created_at",
      );

    switch (data.tab) {
      case "top_rated":
        // Highest ratio of likes vs dislikes, needs some engagement
        q = q.order("score", { ascending: false }).order("like_count", { ascending: false });
        break;
      case "trending": {
        // Recent tracks with the most action in last 14 days
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte("created_at", since).order("score", { ascending: false });
        break;
      }
      case "most_played":
        q = q.order("play_count", { ascending: false });
        break;
      case "most_liked":
        q = q.order("like_count", { ascending: false });
        break;
      case "fresh_reviews":
        q = q.order("created_at", { ascending: false });
        break;
    }

    const { data: rows, error } = await q.limit(data.limit);
    if (error) throw error;

    return (rows ?? []).map((r: any) => {
      const likes = r.like_count ?? 0;
      const dislikes = r.dislike_count ?? 0;
      const total = likes + dislikes;
      const rating = total > 0 ? Math.round(((likes / total) * 5) * 10) / 10 : 0;
      return {
        id: r.id,
        title: r.title,
        artistName: r.artist_name,
        artistUserId: r.artist_user_id ?? null,
        coverUrl: r.cover_url ?? null,
        audioUrl: r.audio_url ?? null,
        durationSeconds: r.duration_seconds ?? null,
        playCount: r.play_count ?? 0,
        likeCount: likes,
        dislikeCount: dislikes,
        score: r.score ?? 0,
        rating,
        ratingCount: total,
        createdAt: r.created_at,
      };
    });
  });