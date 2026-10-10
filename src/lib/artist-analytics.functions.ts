import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ArtistStreamingAnalytics = {
  rangeDays: number;
  summary: {
    totalStreams: number;
    uniqueListeners: number;
    countries: number;
    topCountry: { name: string; streams: number } | null;
    topCity: { name: string; country: string; streams: number } | null;
    topTrack: { name: string; streams: number } | null;
  };
  daily: Array<{ date: string; streams: number }>;
  countries: Array<{ name: string; streams: number; listeners: number }>;
  cities: Array<{ name: string; country: string; streams: number }>;
  regions: Array<{ name: string; streams: number }>;
  tracks: Array<{
    id: string;
    title: string;
    coverUrl: string | null;
    streams: number;
    listeners: number;
    fullListens: number;
  }>;
};

const emptyAnalytics = (rangeDays: number): ArtistStreamingAnalytics => ({
  rangeDays,
  summary: { totalStreams: 0, uniqueListeners: 0, countries: 0, topCountry: null, topCity: null, topTrack: null },
  daily: [], countries: [], cities: [], regions: [], tracks: [],
});

export const getMyStreamingAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ days: z.number().int().min(7).max(365).default(30) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: analytics, error } = await (context.supabase as any)
      .rpc("get_my_streaming_analytics", { p_days: data.days });
    if (error) throw new Error("Unable to load your streaming analytics");
    return (analytics ?? emptyAnalytics(data.days)) as ArtistStreamingAnalytics;
  });