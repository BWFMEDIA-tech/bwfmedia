import { describe, it, expect } from "vitest";
import { tournamentSubmissionBlock, type BattleTournamentState } from "./battle-tournament";

const state: BattleTournamentState = { tournamentId: "test", filled: 12, capacity: 20, available: 8, hasMatchup: false, eliminated: false, canSubmit: true };
describe("tournament selection rules", () => {
  it("blocks a second selection while a matchup exists", () => {
    expect(tournamentSubmissionBlock({ ...state, hasMatchup: true })).not.toBeNull();
    expect(tournamentSubmissionBlock(state)).toBeNull();
  });
  it("closes submissions at exactly 20 slots", () => {
    expect(tournamentSubmissionBlock({ ...state, filled: 19 })).toBeNull();
    expect(tournamentSubmissionBlock({ ...state, filled: 20 })).not.toBeNull();
  });
  it("eliminated artists cannot select opponents", () => {
    expect(tournamentSubmissionBlock({ ...state, eliminated: true })).not.toBeNull();
  });
  it("a winner can re-enter after completion frees a slot", () => {
    expect(tournamentSubmissionBlock({ ...state, filled: 19, hasMatchup: false, eliminated: false })).toBeNull();
  });
});