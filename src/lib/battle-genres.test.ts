import { describe, it, expect } from "vitest";
import { BATTLE_GENRES, isBattleGenre, genreAgreementComplete } from "./battle-genres";

describe("battle genres", () => {
  it("offers the 14 requested genres", () => {
    expect(BATTLE_GENRES.length).toBe(14);
    expect(isBattleGenre("Dancehall / Reggae")).toBe(true);
    expect(isBattleGenre("Metal")).toBe(false);
  });
  it("blocks the battle until both artists agree to the genre", () => {
    expect(genreAgreementComplete({ genre: "Drill", genre_agreed_a: true, genre_agreed_b: false })).toBe(false);
    expect(genreAgreementComplete({ genre: "Drill", genre_agreed_a: true, genre_agreed_b: true })).toBe(true);
  });
  it("leaves older battles without a genre unaffected", () => {
    expect(genreAgreementComplete({ genre: null })).toBe(true);
  });
});
