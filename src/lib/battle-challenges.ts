/** Battle challenge lifecycle rules (shared by server functions and UI). */

export const CHALLENGE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "scheduled",
  "live",
  "completed",
  "cancelled",
] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

/** The challenged artist can only answer a challenge nobody has answered yet. */
export function canRespondToChallenge(status: string): boolean {
  return status === "pending";
}

/** The host can only start a battle once both artists agreed — the challenger
 *  agrees by submitting, the challenged artist by accepting (status leaves
 *  "pending"). */
export function canStartChallenge(status: string): boolean {
  return status === "accepted" || status === "scheduled";
}

/** Either artist can cancel before the battle goes live. */
export function canCancelChallenge(status: string): boolean {
  return status === "pending" || status === "accepted" || status === "scheduled";
}

/** The host can decline anything that has not gone live yet. */
export function canDeclineChallenge(status: string): boolean {
  return canCancelChallenge(status);
}
