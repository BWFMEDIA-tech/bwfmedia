import { supabase } from "@/integrations/supabase/client";

/**
 * Cast a vote in the current battle round. Inserts directly into
 * `battle_votes` — RLS enforces eligibility and the
 * `battle_votes_recalc` trigger updates the round's a_votes/b_votes/
 * a_weight/b_weight in place, which `useArenaLive` then receives over
 * Realtime. No separate VOTES_UPDATED event is needed.
 */
export async function castVote(params: {
  matchId: string;
  roundId: string;
  choice: "a" | "b";
  voterId: string;
  weight?: number;
}) {
  const { error } = await supabase.from("battle_votes").insert({
    match_id: params.matchId,
    round_id: params.roundId,
    voter_id: params.voterId,
    choice: params.choice,
    weight: params.weight ?? 1,
  });
  if (error) throw error;
}