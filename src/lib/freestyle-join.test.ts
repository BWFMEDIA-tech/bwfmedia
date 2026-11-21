import { describe, expect, it } from 'vitest';
import { assignedFreestyleSide, currentFreestyleMatchup, silenceFreestyleMicrophone } from './freestyle-join';

const pair = { id: 'pair', status: 'accepted', stream_id: 'stream', artist_a_id: 'artist-a', artist_b_id: 'artist-b', updated_at: '2026-11-21T02:00:00Z' };
describe('Assigned Freestyle joining', () => {
  it('prompts Artist A only for box A', () => expect(assignedFreestyleSide('artist-a', pair.artist_a_id, pair.artist_b_id)).toBe('A'));
  it('prompts Artist B only for box B', () => expect(assignedFreestyleSide('artist-b', pair.artist_a_id, pair.artist_b_id)).toBe('B'));
  it('does not offer an audience member a performer box', () => expect(assignedFreestyleSide('viewer', pair.artist_a_id, pair.artist_b_id)).toBeNull());
  it('shares the same prepared pair without accepting pending or other-stream entries', () => {
    expect(currentFreestyleMatchup([pair, { ...pair, id: 'pending', status: 'pending' }, { ...pair, id: 'other', stream_id: 'other' }], 'stream')?.id).toBe('pair');
  });
  it('keeps the live pair above a newer prepared matchup', () => {
    expect(currentFreestyleMatchup([{ ...pair, id: 'new', updated_at: '2026-11-21T03:00:00Z' }, { ...pair, id: 'live', status: 'live' }], 'stream')?.id).toBe('live');
  });
  it('allows both assigned performers to use microphones without stage promotion', () => {
    for (const id of ['artist-a', 'artist-b']) expect(silenceFreestyleMicrophone(true, assignedFreestyleSide(id, pair.artist_a_id, pair.artist_b_id) !== null, true, false)).toBe(false);
  });
  it('preserves audience silence', () => expect(silenceFreestyleMicrophone(true, false, true, false)).toBe(true));
  it('preserves host mute on an assigned performer', () => expect(silenceFreestyleMicrophone(false, true, true, true)).toBe(true));
  it('never overrides denied server publication rights', () => expect(silenceFreestyleMicrophone(false, true, false, false)).toBe(true));
});