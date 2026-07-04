/**
 * Pure slot math for the Arena 60-second queue engine. No Web Audio, no IO —
 * everything here is deterministic and unit-tested. The queue drives
 * everything: queue[i] owns the fixed window [epoch + i*slot, epoch + (i+1)*slot).
 */

export const SLOT_SECONDS = 60;

export type SlotTrack = { trackId: string };

export type ScheduledSlot = {
  index: number;
  trackId: string;
  /** Server wall-clock ms when this slot starts / ends. */
  startsAtMs: number;
  endsAtMs: number;
  /** Voting is open for the whole slot and locks exactly at slot end. */
  votingOpensAtMs: number;
  votingLocksAtMs: number;
};

export type SlotPosition = {
  /** Index of the active slot, or -1 when not started / finished. */
  index: number;
  slot: ScheduledSlot | null;
  /** Seconds elapsed inside the active slot. */
  offsetSec: number;
  /** Seconds remaining in the active slot. */
  remainingSec: number;
  notStarted: boolean;
  ended: boolean;
};

/** Each queue item becomes one strict slot: queue[i] -> [i*slot, (i+1)*slot). */
export function buildSlotSchedule(
  queue: SlotTrack[],
  epochStartMs: number,
  slotSeconds: number = SLOT_SECONDS,
): ScheduledSlot[] {
  const slotMs = slotSeconds * 1000;
  return queue.map((item, index) => {
    const startsAtMs = epochStartMs + index * slotMs;
    const endsAtMs = startsAtMs + slotMs;
    return {
      index,
      trackId: item.trackId,
      startsAtMs,
      endsAtMs,
      votingOpensAtMs: startsAtMs,
      votingLocksAtMs: endsAtMs,
    };
  });
}

/** Where the timeline is at server time tMs. */
export function slotPositionAt(schedule: ScheduledSlot[], tMs: number): SlotPosition {
  if (schedule.length === 0) {
    return { index: -1, slot: null, offsetSec: 0, remainingSec: 0, notStarted: true, ended: true };
  }
  const first = schedule[0];
  const last = schedule[schedule.length - 1];
  if (tMs < first.startsAtMs) {
    return {
      index: -1,
      slot: null,
      offsetSec: 0,
      remainingSec: (first.startsAtMs - tMs) / 1000,
      notStarted: true,
      ended: false,
    };
  }
  if (tMs >= last.endsAtMs) {
    return { index: -1, slot: null, offsetSec: 0, remainingSec: 0, notStarted: false, ended: true };
  }
  // Slots are contiguous and equal-length after any reschedule keeps order,
  // so scan (queue sizes are small) rather than assume uniform width.
  for (const slot of schedule) {
    if (tMs >= slot.startsAtMs && tMs < slot.endsAtMs) {
      return {
        index: slot.index,
        slot,
        offsetSec: (tMs - slot.startsAtMs) / 1000,
        remainingSec: (slot.endsAtMs - tMs) / 1000,
        notStarted: false,
        ended: false,
      };
    }
  }
  // Between slots can only happen after an early-end reschedule left a gap.
  return { index: -1, slot: null, offsetSec: 0, remainingSec: 0, notStarted: false, ended: false };
}

/**
 * Voting is open during [slot start, slot end) — locked exactly at 60s.
 *
 * NOTE: this window is CLIENT-ADVISORY (drives UI state). Authoritative vote
 * acceptance stays server-side: battle votes are gated by
 * battle_rounds.voting_status inside the cast_battle_vote RPC. When slots are
 * wired to drive server voting, the server must derive the same window from
 * arena_playback_state rather than trusting the client's clock.
 */
export function isVotingOpenAt(slot: ScheduledSlot, tMs: number): boolean {
  return tMs >= slot.votingOpensAtMs && tMs < slot.votingLocksAtMs;
}

/**
 * Vote-driven early transition: end slot `fromIndex` at newBoundaryMs and
 * pull every later slot forward, preserving slot lengths. Slots before
 * fromIndex are untouched (history is immutable).
 */
export function rescheduleFrom(
  schedule: ScheduledSlot[],
  fromIndex: number,
  newBoundaryMs: number,
): ScheduledSlot[] {
  const out: ScheduledSlot[] = [];
  for (const slot of schedule) {
    if (slot.index < fromIndex) {
      out.push(slot);
    } else if (slot.index === fromIndex) {
      const boundary = Math.max(slot.startsAtMs, Math.min(newBoundaryMs, slot.endsAtMs));
      out.push({ ...slot, endsAtMs: boundary, votingLocksAtMs: boundary });
    } else {
      const lengthMs = slot.endsAtMs - slot.startsAtMs;
      const startsAtMs = out[out.length - 1].endsAtMs;
      out.push({
        ...slot,
        startsAtMs,
        endsAtMs: startsAtMs + lengthMs,
        votingOpensAtMs: startsAtMs,
        votingLocksAtMs: startsAtMs + lengthMs,
      });
    }
  }
  return out;
}

/**
 * Derive the shared epoch from the published sync row:
 * epoch = last_sync_at - position_seconds. Every client reads the same row,
 * so every client derives the identical epoch.
 */
export function epochFromSyncRow(lastSyncAtIso: string, positionSeconds: number): number {
  return new Date(lastSyncAtIso).getTime() - positionSeconds * 1000;
}
