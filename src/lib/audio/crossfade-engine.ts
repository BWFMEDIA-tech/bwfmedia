/**
 * Gain envelopes for slot playback. Everything operates on the minimal
 * AudioParam surface so envelopes are unit-testable with a mock param.
 */

export type AudioParamLike = {
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  cancelScheduledValues?(time: number): unknown;
};

export type EnvelopeSpec = {
  fadeInSec: number;
  fadeOutSec: number;
  holdLevel: number;
};

/** Spec envelope: fade in over 1s, hold, fade out over the final second. */
export const SLOT_ENVELOPE: EnvelopeSpec = { fadeInSec: 1, fadeOutSec: 1, holdLevel: 1 };

/**
 * 60-second slot envelope, scheduled entirely in advance:
 *   0 @ start → hold @ start+fadeIn → hold @ start+dur-fadeOut → 0 @ start+dur
 */
export function applySlotEnvelope(
  gain: AudioParamLike,
  startTime: number,
  durationSec: number,
  spec: EnvelopeSpec = SLOT_ENVELOPE,
): void {
  const fadeIn = Math.min(spec.fadeInSec, durationSec / 2);
  const fadeOut = Math.min(spec.fadeOutSec, durationSec / 2);
  gain.setValueAtTime(0, startTime);
  gain.linearRampToValueAtTime(spec.holdLevel, startTime + fadeIn);
  gain.setValueAtTime(spec.holdLevel, startTime + durationSec - fadeOut);
  gain.linearRampToValueAtTime(0, startTime + durationSec);
}

/**
 * Late-join variant: the listener enters mid-slot, so the level starts at
 * hold immediately and only the tail fade-out is scheduled.
 */
export function applyMidSlotEnvelope(
  gain: AudioParamLike,
  nowTime: number,
  slotEndTime: number,
  spec: EnvelopeSpec = SLOT_ENVELOPE,
): void {
  const fadeOut = Math.min(spec.fadeOutSec, Math.max(0, slotEndTime - nowTime));
  gain.setValueAtTime(spec.holdLevel, nowTime);
  if (slotEndTime > nowTime) {
    gain.setValueAtTime(spec.holdLevel, slotEndTime - fadeOut);
    gain.linearRampToValueAtTime(0, slotEndTime);
  }
}

/**
 * DJ-style boundary blend (optional mode): the outgoing track rides past the
 * boundary and fades out while the incoming one fades in — slot windows and
 * voting locks are untouched.
 */
export function applyCrossfade(
  currentGain: AudioParamLike,
  nextGain: AudioParamLike,
  boundaryTime: number,
  overlapSec = 2,
): void {
  currentGain.setValueAtTime(1, boundaryTime);
  currentGain.linearRampToValueAtTime(0, boundaryTime + overlapSec);
  nextGain.setValueAtTime(0, boundaryTime);
  nextGain.linearRampToValueAtTime(1, boundaryTime + overlapSec);
}

/**
 * Optional energy curve: quick intro ramp, full energy through the body,
 * a hype lift at the finish, then the mandatory fade to zero at slot end.
 *   0–2s ramp to 0.75 → 10s at 1.0 → 50s hold → 59s hype 1.0→1.15 → 60s 0
 * (Values above 1 are tamed by the engine's master gain headroom.)
 */
export function applyEnergyCurve(
  gain: AudioParamLike,
  startTime: number,
  durationSec: number,
): void {
  const intro = Math.min(10, durationSec / 6);
  const outro = Math.min(10, durationSec / 6);
  gain.setValueAtTime(0, startTime);
  gain.linearRampToValueAtTime(0.75, startTime + Math.min(2, intro / 2));
  gain.linearRampToValueAtTime(1, startTime + intro);
  gain.setValueAtTime(1, startTime + durationSec - outro);
  gain.linearRampToValueAtTime(1.15, startTime + durationSec - 1);
  gain.linearRampToValueAtTime(0, startTime + durationSec);
}
