import { describe, expect, it } from 'vitest';
import { freestylePlacement } from './freestyle-placement';

const accepted = { id: 'match', status: 'accepted', slot_number: 1, artist_a_id: 'artist-a', artist_b_id: 'artist-b', stream_id: null };
describe('Freestyle video placement', () => {
  it('places the accepted artists in their fixed A and B boxes', () => {
    expect(freestylePlacement([accepted], 'match', 'room')).toEqual({ artistA: 'artist-a', artistB: 'artist-b' });
  });
  it('rejects an unaccepted challenge', () => {
    expect(freestylePlacement([{ ...accepted, status: 'pending' }], 'match', 'room')).toBeNull();
  });
  it('rejects a matchup assigned to another stream', () => {
    expect(freestylePlacement([{ ...accepted, stream_id: 'other-room' }], 'match', 'room')).toBeNull();
  });
});