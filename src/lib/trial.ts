export const FREE_TRIAL_DAYS = 30;

type Sub = { status?: string | null; current_period_end?: string | null } | null;

/** True when the member is trialing, paid, or in a canceled grace period. */
export function hasTrialAccess(sub: Sub, now = Date.now()): boolean {
  if (!sub?.status) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  if (["trialing", "active", "past_due"].includes(sub.status)) return !end || end > now;
  if (sub.status === "canceled") return !!end && end > now;
  return false;
}
