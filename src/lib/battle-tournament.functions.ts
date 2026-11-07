import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BattleTournamentState } from "./battle-tournament";

export const getBattleTournamentState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BattleTournamentState> => {
    const { data, error } = await context.supabase.rpc("get_battle_tournament_state");
    if (error) throw new Error(error.message);
    return data as unknown as BattleTournamentState;
  });

export const startNewBattleTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("start_new_battle_tournament");
    if (error) throw new Error(error.message);
    return { tournamentId: data };
  });