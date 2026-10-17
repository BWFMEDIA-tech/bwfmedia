import { describe, expect, it } from 'vitest';
import { PlaybackProgress, countryStreams } from './playback-progress';
describe('30-second qualification', () => {
  it('qualifies at 30 actual seconds, not 29', () => {
    const p = new PlaybackProgress(); p.resetPosition(0,0);
    expect(p.sample(29,29000,true,false)).toBe(29);
    expect(p.sample(30,30000,true,false)).toBe(30);
  });
  it('excludes pauses, buffering and seeks', () => {
    const p = new PlaybackProgress(); p.resetPosition(0,0);
    p.sample(10,10000,true,false); p.sample(10,60000,false,false);
    p.sample(10,70000,true,false); p.sample(100,71000,true,true);
    expect(p.sample(105,76000,true,false)).toBe(15);
  });
  it('rejects seek jumps before seeking fires', () => {
    const p = new PlaybackProgress(); p.resetPosition(0,0);
    expect(p.sample(60,1000,true,false)).toBe(0);
  });
});
it('highlights US streams without lighting countries with no streams', () => {
 const rows = [{name:'United States',streams:3}];
 expect(countryStreams('United States of America',rows)).toBe(3);
 expect(countryStreams('Canada',rows)).toBe(0);
});
