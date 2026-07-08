import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  mergeScoreUpdate,
  type BattleScoreMap,
  type ScoreUpdate,
} from "@/lib/battle-scores";

/**
 * Live Hype/Pass scores for one battle. Three feeds converge on the same
 * monotonic merge, so ordering between them never matters:
 *  1. broadcast `score_update` on channel battle:{battleId} (primary, emitted
 *     by the battle_scores DB trigger)
 *  2. postgres_changes on battle_scores (fallback)
 *  3. applyUpdate() — the RPC response after casting a reaction
 */
export function useBattleScores(battleId: string | null) {
  const [scores, setScores] = useState<BattleScoreMap>({});

  const applyUpdate = useCallback((update: ScoreUpdate) => {
    setScores((prev) => mergeScoreUpdate(prev, update));
  }, []);

  useEffect(() => {
    setScores({});
    if (!battleId) return;
    let cancelled = false;

    const fetchScores = async () => {
      const { data } = await supabase
        .from("battle_scores" as any)
        .select("artist_id, hype_score, pass_score")
        .eq("battle_id", battleId);
      if (cancelled || !data) return;
      setScores((prev) =>
        (data as unknown as ScoreUpdate[]).reduce(
          (acc, row) => mergeScoreUpdate(acc, row),
          prev,
        ),
      );
    };
    void fetchScores();

    const channel = supabase
      .channel(`battle:${battleId}`)
      .on("broadcast", { event: "score_update" }, ({ payload }) => {
        if (payload) applyUpdate(payload as ScoreUpdate);
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "battle_scores",
          filter: `battle_id=eq.${battleId}`,
        },
        (payload) => {
          const row = payload.new as ScoreUpdate | null;
          if (row?.artist_id) applyUpdate(row);
        },
      )
      .subscribe((status) => {
        // Heal missed events: refetch on every (re)join — the monotonic
        // merge makes replays harmless. Errors surface for diagnostics.
        if (status === "SUBSCRIBED") void fetchScores();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[battle:${battleId}] realtime channel ${status}`);
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [battleId, applyUpdate]);

  return { scores, applyUpdate };
}
