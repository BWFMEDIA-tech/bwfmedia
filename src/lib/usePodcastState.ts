import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PodcastState {
  session_live: boolean;
  pinned_id: string | null;
  cursor: number;
  playing: boolean;
  audio_idx: number;
  updated_at: string;
}

const DEFAULT_STATE: PodcastState = {
  session_live: true,
  pinned_id: null,
  cursor: 0,
  playing: false,
  audio_idx: 0,
  updated_at: new Date(0).toISOString(),
};

/**
 * Realtime-synced Live Podcast Studio state. All viewers see the same
 * pinned guest, session status, and current speaker cursor instantly.
 * Writes require admin role (enforced via RLS); silently no-op for others.
 */
export function usePodcastState() {
  const [state, setState] = useState<PodcastState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from("podcast_state")
        .select("session_live, pinned_id, cursor, playing, audio_idx, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (!mounted) return;
      if (data) setState(data as PodcastState);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("podcast-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "podcast_state" },
        (payload) => {
          const next = (payload.new ?? payload.old) as PodcastState | undefined;
          if (next) setState(next);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const update = useCallback(async (patch: Partial<Omit<PodcastState, "updated_at">>) => {
    // Optimistic local update for snappy host UX. Realtime will reconcile.
    setState((prev) => ({ ...prev, ...patch, updated_at: new Date().toISOString() }));
    const { error } = await supabase
      .from("podcast_state")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1);
    return { ok: !error, error: error?.message ?? null };
  }, []);

  return { state, loading, update };
}