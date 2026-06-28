import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Public read: aggregate live earnings for a stream + current pool growth. */
export const getStreamLiveEarnings = createServerFn({ method: "GET" })
  .inputValidator((data: { streamId: string }) => {
    if (!data?.streamId) throw new Error("streamId required");
    return data;
  })
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    // Tips paid on this stream
    const { data: tipsRows } = await sb
      .from("tips")
      .select("amount_cents")
      .eq("stream_id", data.streamId)
      .eq("status", "paid");
    const stream_cents = (tipsRows ?? []).reduce(
      (s: number, r: any) => s + (r.amount_cents ?? 0),
      0,
    );
    const tip_count = tipsRows?.length ?? 0;

    // Current month revenue pool total (all sources)
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthIso = monthStart.toISOString().slice(0, 10);
    const { data: poolRows } = await sb
      .from("revenue_pool_entries")
      .select("amount_cents")
      .eq("month", monthIso);
    const pool_cents = (poolRows ?? []).reduce(
      (s: number, r: any) => s + Number(r.amount_cents ?? 0),
      0,
    );

    return { stream_cents, tip_count, pool_cents };
  });