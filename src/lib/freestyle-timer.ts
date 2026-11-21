// Countdown source for the 1v1 Freestyle Battle header timer.
// A live battle counts down from its server-set ends_at; when the host has
// just pressed Start, an optimistic local deadline keeps the timer moving
// until the battle row arrives; a finished battle holds at 0; with no battle
// at all the timer shows the selected duration.
export function freestyleRemainingSeconds(options: {
  battle?: { status: string; ends_at: string } | null;
  optimisticEndsAt?: number | null;
  duration: number;
  now: number;
  clockOffset?: number;
}): number {
  const { battle, optimisticEndsAt, duration, now, clockOffset = 0 } = options;
  if (battle?.status === 'live') {
    return Math.max(0, Math.ceil((Date.parse(battle.ends_at) - now - clockOffset) / 1000));
  }
  if (optimisticEndsAt) {
    return Math.max(0, Math.ceil((optimisticEndsAt - now) / 1000));
  }
  return battle ? 0 : duration;
}
