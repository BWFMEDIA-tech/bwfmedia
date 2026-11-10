import { describe, expect, it } from 'vitest';
import { battleArtistIds } from './freestyle-stage';

describe('Stage ARTIST box during a live battle', () => {
  it('holds both performers of a live battle out of the ARTIST box', () => {
    const ids = battleArtistIds([{ status: 'live', artist_a_id: 'artist-a', artist_b_id: 'artist-b' }]);
    expect(ids.has('artist-a')).toBe(true);
    expect(ids.has('artist-b')).toBe(true);
  });
  it('releases the box once the battle is no longer live', () => {
    expect(battleArtistIds([{ status: 'completed', artist_a_id: 'artist-a', artist_b_id: 'artist-b' }]).size).toBe(0);
    expect(battleArtistIds([{ status: 'cancelled', artist_a_id: 'artist-a', artist_b_id: 'artist-b' }]).size).toBe(0);
  });
  it('holds nothing when no battle is running', () => {
    expect(battleArtistIds([]).size).toBe(0);
  });
});
