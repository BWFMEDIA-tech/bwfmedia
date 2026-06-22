export type ArenaStatus = "lobby" | "live" | "voting" | "ended";

export type ArenaPhase = "queue" | "playing" | "voting" | "results";

export type VoteChoice = "a" | "b";

export type BattleMatch = {
  id: string;
  stream_id: string | null;
  artist_a_id: string;
  artist_b_id: string;
  artist_a_name: string | null;
  artist_b_name: string | null;
  status: ArenaStatus;
  current_round: number;
  total_rounds: number;
  current_round_id: string | null;
  a_wins: number;
  b_wins: number;
  winner_id: string | null;
  started_at: string | null;
};

export type BattleRound = {
  id: string;
  match_id: string;
  round_number: number;
  status: "live" | "open" | "closed";
  active_side: "a" | "b" | null;
  a_votes: number;
  b_votes: number;
  a_weight: number;
  b_weight: number;
  ends_at: string | null;
  winner_choice: VoteChoice | "tie" | null;
};

export type BattleVote = {
  id: string;
  round_id: string;
  voter_id: string;
  choice: VoteChoice;
  created_at: string;
};