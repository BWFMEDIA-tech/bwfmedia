export type BattleTournamentState = {
  tournamentId: string | null;
  filled: number;
  capacity: number;
  available: number;
  hasMatchup: boolean;
  eliminated: boolean;
  canSubmit: boolean;
};

export function tournamentSubmissionBlock(state: BattleTournamentState): string | null {
  if (state.eliminated) return "Eliminated from this tournament";
  if (state.hasMatchup) return "You already have a pending or active matchup";
  if (state.filled >= 20) return "All 20 battle slots are filled";
  return null;
}