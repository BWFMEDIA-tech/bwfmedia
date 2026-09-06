/**
 * Arena titles & win-streak milestones for battle artists.
 * Pure helpers — safe to import from client and server code.
 */

export type ArtistTitle = {
  /** Stable key, e.g. "arena_rookie" */
  key: string;
  /** Display label, e.g. "Arena Rookie" */
  label: string;
  /** Minimum lifetime battle wins required */
  minWins: number;
  /** Accent hex color */
  color: string;
};

/** Ordered highest → lowest so the first match is the earned title. */
export const ARTIST_TITLES: ArtistTitle[] = [
  { key: "hall_of_fame", label: "Hall of Fame", minWins: 100, color: "#FFD700" },
  { key: "elite", label: "Elite", minWins: 50, color: "#FF00A6" },
  { key: "champion", label: "Champion", minWins: 25, color: "#C53DFF" },
  { key: "challenger", label: "Challenger", minWins: 10, color: "#00E6FF" },
  { key: "contender", label: "Contender", minWins: 5, color: "#004BFF" },
  { key: "arena_rookie", label: "Arena Rookie", minWins: 1, color: "#22c55e" },
];

export function getArtistTitle(battleWins: number): ArtistTitle | null {
  return ARTIST_TITLES.find((t) => battleWins >= t.minWins) ?? null;
}

export function getNextTitle(battleWins: number): ArtistTitle | null {
  const upcoming = [...ARTIST_TITLES]
    .reverse()
    .find((t) => battleWins < t.minWins);
  return upcoming ?? null;
}

/** Win-streak milestones the platform celebrates: 5, 10, 25. */
export const STREAK_MILESTONES = [25, 10, 5] as const;

/** Highest streak milestone reached, or null below 5. */
export function getStreakMilestone(streak: number): number | null {
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) return m;
  }
  return null;
}

export type CompletedMatchOutcome = {
  winnerId: string | null;
  /** Sortable timestamp for the match (ended_at ?? updated_at ?? created_at) */
  at: string;
};

/**
 * Compute the current and best win streak for one artist from their
 * completed matches (must be sorted oldest → newest).
 */
export function computeStreaks(
  matches: CompletedMatchOutcome[],
  artistId: string,
): { currentStreak: number; bestStreak: number } {
  let current = 0;
  let best = 0;
  for (const m of matches) {
    if (m.winnerId === artistId) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return { currentStreak: current, bestStreak: best };
}
