import { castBattleVote } from "@/lib/battle-vote.functions";

/**
 * Cast a vote in the current battle round. Routes through the
 * `castBattleVote` server function, which enforces rate limits, charges
 * boost activations for weight=5, and writes IP/UA audit records.
 * The `battle_votes_recalc` trigger fans the result out over Realtime.
 */
export async function castVote(params: {
  matchId: string;
  roundId: string;
  choice: "a" | "b";
  voterId: string;
  weight?: number;
}) {
  const w = (params.weight ?? 1) as 1 | 5;
  await castBattleVote({
    data: {
      match_id: params.matchId,
      round_id: params.roundId,
      choice: params.choice,
      weight: w,
    },
  });
}