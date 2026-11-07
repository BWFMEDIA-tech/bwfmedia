import { describe, expect, it } from 'vitest';
import { confirmedFreestyleMatchups } from './confirmed-freestyle';

describe('confirmed Freestyle overview', () => {
  it('displays accepted, scheduled and live matchups only', () => {
    const rows = ['pending', 'accepted', 'scheduled', 'live', 'declined', 'completed', 'cancelled'].map((status, i) => ({ status, slot_number: i + 1 }));
    expect(confirmedFreestyleMatchups(rows).map(row => row.status)).toEqual(['live', 'scheduled', 'accepted']);
  });
  it('does not display an unassigned slot', () => {
    expect(confirmedFreestyleMatchups([{ status: 'accepted', slot_number: null }])).toEqual([]);
  });
  it('has no placeholder entries when empty', () => {
    expect(confirmedFreestyleMatchups([])).toEqual([]);
  });
  it('keeps the assigned slot numbers', () => {
    expect(confirmedFreestyleMatchups([{ status: 'accepted', slot_number: 7 }, { status: 'accepted', slot_number: 2 }]).map(row => row.slot_number)).toEqual([2, 7]);
  });
});