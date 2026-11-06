/** Genres artists can compete in for 1v1 battles. Must match public.is_valid_battle_genre(). */
export const BATTLE_GENRES = [
  "Hip-Hop / Rap",
  "R&B",
  "Trap",
  "Drill",
  "Pop",
  "Gospel",
  "Country",
  "Rock",
  "Afrobeat",
  "Dancehall / Reggae",
  "Latin",
  "Electronic / EDM",
  "Jazz",
  "Other",
] as const;

export type BattleGenre = (typeof BATTLE_GENRES)[number];

export function isBattleGenre(v: unknown): v is BattleGenre {
  return typeof v === "string" && (BATTLE_GENRES as readonly string[]).includes(v);
}

/** Voting may only begin once both artists agreed to the battle's genre (legacy matches without a genre are exempt). */
export function genreAgreementComplete(m: {
  genre?: string | null;
  genre_agreed_a?: boolean | null;
  genre_agreed_b?: boolean | null;
}): boolean {
  if (!m.genre) return true;
  return !!m.genre_agreed_a && !!m.genre_agreed_b;
}
