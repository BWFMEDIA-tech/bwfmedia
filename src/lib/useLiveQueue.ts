import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveQueueTier = "basic" | "featured" | "premium";
export type LiveQueueStatus = "queued" | "next_up" | "live" | "done";

export interface LiveQueueRow {
  id: string;
  artist_name: string;
  song_title: string | null;
  song_link: string;
  photo_url: string | null;
  tier: LiveQueueTier;
  queue_status: LiveQueueStatus;
  created_at: string;
  paid_at: string | null;
}

const TIER_RANK: Record<LiveQueueTier, number> = { premium: 0, featured: 1, basic: 2 };
const STATUS_RANK: Record<LiveQueueStatus, number> = {
  live: 0,
  next_up: 1,
  queued: 2,
  done: 3,
};

export function sortQueue(rows: LiveQueueRow[]): LiveQueueRow[] {
  return [...rows].sort((a, b) => {
    const s = STATUS_RANK[a.queue_status] - STATUS_RANK[b.queue_status];
    if (s !== 0) return s;
    const t = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    if (t !== 0) return t;
    return new Date(a.paid_at ?? a.created_at).getTime() -
      new Date(b.paid_at ?? b.created_at).getTime();
  });
}

/**
 * Subscribes to the public live review queue. Uses Supabase Realtime to
 * push updates immediately when an admin advances the queue or a new
 * artist completes payment. Falls back to a 10s poll as a safety net.
 */
export function useLiveQueue() {
  const [rows, setRows] = useState<LiveQueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase
        .from("live_queue_public")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) setRows(sortQueue(data as LiveQueueRow[]));
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("live-queue-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_submissions" },
        () => load(),
      )
      .subscribe();

    const poll = setInterval(load, 10_000);

    return () => {
      mounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  return { rows, loading };
}