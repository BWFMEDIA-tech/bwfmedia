import { describe, expect, it } from 'vitest';
import { freestyleRemainingSeconds } from './freestyle-timer';

const NOW = 1_800_000_000_000;

describe('freestyleRemainingSeconds', () => {
  it('counts down from the server end time while a battle is live', () => {
    const endsAt = new Date(NOW + 120_000).toISOString();
    expect(freestyleRemainingSeconds({ battle: { status: 'live', ends_at: endsAt }, duration: 180, now: NOW })).toBe(120);
  });

  it('starts counting from the optimistic deadline the moment Start is pressed', () => {
    const optimisticEndsAt = NOW + 180_000;
    expect(freestyleRemainingSeconds({ battle: null, optimisticEndsAt, duration: 180, now: NOW + 5_000 })).toBe(175);
  });

  it('prefers the live battle over the optimistic deadline once it arrives', () => {
    const endsAt = new Date(NOW + 179_000).toISOString();
    expect(freestyleRemainingSeconds({ battle: { status: 'live', ends_at: endsAt }, optimisticEndsAt: NOW + 180_000, duration: 180, now: NOW })).toBe(179);
  });

  it('shows zero for a finished battle instead of resetting to the duration', () => {
    const endsAt = new Date(NOW - 1_000).toISOString();
    expect(freestyleRemainingSeconds({ battle: { status: 'completed', ends_at: endsAt }, duration: 180, now: NOW })).toBe(0);
  });

  it('shows the selected duration before any battle or start attempt', () => {
    expect(freestyleRemainingSeconds({ battle: null, duration: 300, now: NOW })).toBe(300);
  });

  it('never goes below zero', () => {
    expect(freestyleRemainingSeconds({ battle: null, optimisticEndsAt: NOW - 10_000, duration: 180, now: NOW })).toBe(0);
  });
});
