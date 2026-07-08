export type BattleReactionAction = "hype" | "pass";

export type ScoreUpdate = {
  artist_id: string;
  hype_score: number;
  pass_score: number;
  battle_score?: number;
};

export type ArtistScore = {
  artist_id: string;
  hype_score: number;
  pass_score: number;
  battle_score: number;
  /** Bumps on every real change — the UI keys pulse animations off this. */
  rev: number;
};

export type BattleScoreMap = Record<string, ArtistScore>;

/**
 * Merge a realtime score frame into the map. Reactions are immutable and
 * unique per (user, battle, artist), so both counters are monotonically
 * increasing — taking the max per counter means late or out-of-order frames
 * (broadcast vs postgres_changes vs RPC response) can never regress the
 * display. Returns the same reference when nothing changed.
 */
export function mergeScoreUpdate(map: BattleScoreMap, update: ScoreUpdate): BattleScoreMap {
  const prev = map[update.artist_id];
  const hype = Math.max(prev?.hype_score ?? 0, update.hype_score ?? 0);
  const pass = Math.max(prev?.pass_score ?? 0, update.pass_score ?? 0);
  if (prev && prev.hype_score === hype && prev.pass_score === pass) return map;
  return {
    ...map,
    [update.artist_id]: {
      artist_id: update.artist_id,
      hype_score: hype,
      pass_score: pass,
      battle_score: hype - pass,
      rev: (prev?.rev ?? 0) + 1,
    },
  };
}

/** Artist ids ordered by net score (leader first); stable for ties. */
export function rankArtists(map: BattleScoreMap, artistIds: string[]): string[] {
  return [...artistIds].sort(
    (a, b) => (map[b]?.battle_score ?? 0) - (map[a]?.battle_score ?? 0),
  );
}
