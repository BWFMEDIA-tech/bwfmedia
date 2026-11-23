// @auth-exempt: public read of non-sensitive track data.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { rankUnique } from "@/lib/chart-ranking";

export type ChartTab = "top_100" | "trending" | "most_played" | "most_liked" | "fresh_reviews";

export type ChartTrack = {
  id: string;
  title: string;
  artistName: string;
  artistUserId: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  playCount: number;
  recentPlays: number;
  likeCount: number;
  dislikeCount: number;
  score: number;
  rating: number; // 0..5
  ratingCount: number;
  createdAt: string;
};

export type ChartResult = { tracks: ChartTrack[]; updatedAt: string };

const TRENDING_DAYS = 7;

export const getCharts = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        tab: z.enum(["top_100", "trending", "most_played", "most_liked", "fresh_reviews"]).default("top_100"),
        limit: z.number().int().min(1).max(100).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<ChartResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    // Audio links are only returned to signed-in listeners.
    let signedIn = false;
    try {
      const auth = getRequestHeader("authorization") ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (token) signedIn = !!(await supabaseAdmin.auth.getUser(token)).data.user;
    } catch { signedIn = false; }

    // Over-fetch so duplicates and artwork-less rows can be dropped and
    // still leave a full chart.
    let q = sb
      .from("play_tracks")
      .select(
        "id, title, artist_name, artist_user_id, cover_url, audio_url, duration_seconds, play_count, like_count, dislike_count, score, created_at",
      )
      .in("status", ["playing", "completed"])
      .not("cover_url", "is", null);

    switch (data.tab) {
      case "top_100":
      case "most_played":
        q = q.order("play_count", { ascending: false });
        break;
      case "most_liked":
        q = q.order("like_count", { ascending: false });
        break;
      case "fresh_reviews":
        q = q.order("created_at", { ascending: false });
        break;
      case "trending":
        break;
    }

    const recent = new Map<string, number>();
    if (data.tab === "trending") {
      const since = new Date(Date.now() - TRENDING_DAYS * 86_400_000).toISOString();
      const { data: ev, error: evErr } = await sb
        .from("stream_events")
        .select("track_id")
        .gte("created_at", since)
        .eq("is_suspicious", false)
        .not("track_id", "is", null)
        .limit(20000);
      if (evErr) throw evErr;
      for (const e of ev ?? []) recent.set(e.track_id, (recent.get(e.track_id) ?? 0) + 1);
      const ids = [...recent.keys()];
      if (ids.length === 0) return { tracks: [], updatedAt: new Date().toISOString() };
      q = q.in("id", ids.slice(0, 500));
    }

    const { data: rows, error } = await q.limit(400);
    if (error) throw error;

    const mapped: ChartTrack[] = (rows ?? []).map((r: any) => {
      const likes = r.like_count ?? 0;
      const dislikes = r.dislike_count ?? 0;
      const total = likes + dislikes;
      return {
        id: r.id,
        title: r.title,
        artistName: r.artist_name,
        artistUserId: r.artist_user_id ?? null,
        coverUrl: r.cover_url ?? null,
        audioUrl: signedIn ? (r.audio_url ?? null) : null,
        durationSeconds: r.duration_seconds ?? null,
        playCount: r.play_count ?? 0,
        recentPlays: recent.get(r.id) ?? 0,
        likeCount: likes,
        dislikeCount: dislikes,
        score: r.score ?? 0,
        rating: total > 0 ? Math.round((likes / total) * 50) / 10 : 0,
        ratingCount: total,
        createdAt: r.created_at,
      };
    });

    const metric: Record<ChartTab, (t: ChartTrack) => number> = {
      top_100: (t) => t.playCount,
      most_played: (t) => t.playCount,
      most_liked: (t) => t.likeCount,
      trending: (t) => t.recentPlays,
      fresh_reviews: (t) => Date.parse(t.createdAt) || 0,
    };
    let ranked = rankUnique(mapped, metric[data.tab], data.limit);
    if (data.tab === "fresh_reviews") ranked = ranked.filter((t) => t.ratingCount > 0).concat(ranked.filter((t) => t.ratingCount === 0)).slice(0, data.limit);
    if (data.tab === "top_100" || data.tab === "most_played") ranked = ranked.filter((t) => t.playCount > 0);
    return { tracks: ranked, updatedAt: new Date().toISOString() };
  });
