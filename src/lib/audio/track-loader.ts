/**
 * Track buffer loader: signed-URL resolution -> fetch -> decodeAudioData,
 * with an LRU cache keyed by trackId. Framework-free: the URL signer is
 * injected so the loader is testable and reusable outside React.
 */

export type TrackAudioSource = {
  trackId: string;
  /** Public/storage URL as stored on play_tracks.audio_url. */
  audioUrl: string;
};

export type SignUrl = (url: string) => Promise<string>;

export class TrackBufferLoader {
  private cache = new Map<string, AudioBuffer>();
  private inflight = new Map<string, Promise<AudioBuffer>>();

  constructor(
    private readonly ctx: AudioContext,
    private readonly signUrl: SignUrl,
    private readonly maxCached = 12,
  ) {}

  get(trackId: string): AudioBuffer | undefined {
    return this.cache.get(trackId);
  }

  async load(track: TrackAudioSource, signal?: AbortSignal): Promise<AudioBuffer> {
    const cached = this.cache.get(track.trackId);
    if (cached) return cached;
    const pending = this.inflight.get(track.trackId);
    if (pending) return pending;

    const promise = (async () => {
      const url = await this.signUrl(track.audioUrl);
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Track fetch failed (${res.status}) for ${track.trackId}`);
      const bytes = await res.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(bytes);
      this.put(track.trackId, buffer);
      return buffer;
    })();

    this.inflight.set(track.trackId, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(track.trackId);
    }
  }

  private put(trackId: string, buffer: AudioBuffer): void {
    // Simple LRU: Map iteration order is insertion order; re-insert on write
    // and evict the oldest entry when over capacity.
    this.cache.delete(trackId);
    this.cache.set(trackId, buffer);
    while (this.cache.size > this.maxCached) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
