export const FREE_TRIAL_DAYS = 0;
export const ARTIST_TRIAL_DAYS = 0;

/** No plan offers a free trial; every paid plan bills from the first day. */
export function getPlanTrialDays(planId: string): number {
  return ["artist_pro", "artist_monthly", "bwf_artist_membership_monthly"].includes(planId)
    ? ARTIST_TRIAL_DAYS
    : FREE_TRIAL_DAYS;
}

type Sub = { status?: string | null; current_period_end?: string | null } | null;

/** True when the member is trialing, paid, or in a canceled grace period. */
export function hasTrialAccess(sub: Sub, now = Date.now()): boolean {
  if (!sub?.status) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  if (["trialing", "active", "past_due"].includes(sub.status)) return !end || end > now;
  if (sub.status === "canceled") return !!end && end > now;
  return false;
}
