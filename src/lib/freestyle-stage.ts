/**
 * Stage routing for live 1v1 freestyle battles.
 *
 * While a battle is running, its two performers belong in the battle's own
 * A/B video boxes. They must never be dropped into the Stream Studio stage
 * ARTIST box, even though starting a battle requires them to hold stage
 * camera access.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFreestyleState } from "./freestyle.functions";

export type LiveBattleRow = {
  status?: string | null;
  artist_a_id: string | null;
  artist_b_id: string | null;
};

/**
 * Identities of the performers of one live battle. Rows for battles that are
 * not live (accepted, scheduled, completed, cancelled) never count — the
 * stage box is free again the moment a battle stops being live.
 */
export function battleArtistIds(rows: LiveBattleRow[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.status && row.status !== "live") continue;
    if (row.artist_a_id) ids.add(row.artist_a_id);
    if (row.artist_b_id) ids.add(row.artist_b_id);
  }
  return ids;
}

/**
 * Live battle performers for a stream, kept current through realtime so the
 * stage ARTIST box releases them as soon as the battle ends.
 */
export function useLiveBattleArtistIds(streamId?: string | null): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set<string>());

  useEffect(() => {
    if (!streamId) {
      setIds(new Set<string>());
      return;
    }
    let cancelled = false;

    const refresh = async () => {
      try {
        const { battle } = await getFreestyleState({ data: { streamId } });
        if (cancelled) return;
        setIds(battleArtistIds(battle ? [battle] : []));
      } catch {
        // Retain the last known isolation state on transient connection errors.
      }
    };

    void refresh();
    // Restricted rows no longer emit audience realtime events; polling keeps
    // the safe display state and stage isolation current for those viewers.
    const timer = setInterval(() => void refresh(), 5000);

    // One channel per mount: a subscribed realtime channel cannot take a new
    // database callback, and the stage can mount more than once per page.
    const channel = supabase
      .channel(`freestyle-stage-${streamId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "freestyle_battles", filter: `stream_id=eq.${streamId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return ids;
}
