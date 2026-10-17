/** Accumulate actual playback, never seek distance or paused time. */
export class PlaybackProgress {
  seconds = 0;
  private position: number | null = null;
  private sampledAt = 0;
  resetPosition(position: number, now: number) { this.position = position; this.sampledAt = now; }
  sample(position: number, now: number, playing: boolean, seeking: boolean) {
    if (this.position !== null && playing && !seeking) {
      const delta = position - this.position;
      const elapsed = Math.max(0, (now - this.sampledAt) / 1000);
      if (delta > 0 && delta <= elapsed + 0.5) this.seconds += Math.min(delta, elapsed);
    }
    this.resetPosition(position, now);
    return Math.floor(this.seconds);
  }
}
const ALIASES: Record<string, string> = { 'United States of America': 'United States', 'Dem. Rep. Congo': 'Congo - Kinshasa', 'Central African Rep.': 'Central African Republic', 'Dominican Rep.': 'Dominican Republic', 'Eq. Guinea': 'Equatorial Guinea', 'S. Sudan': 'South Sudan' };
export function countryStreams(name: string, countries: Array<{ name: string; streams: number }>) {
  return countries.filter(c => c.name === (ALIASES[name] ?? name) || c.name === name).reduce((total,c) => total + c.streams, 0);
}
