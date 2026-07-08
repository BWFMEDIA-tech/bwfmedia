import type { TrackAudioSource } from "./track-loader";

/**
 * Mandatory preload phase: every queue track is loaded and decoded BEFORE
 * anything is scheduled. Bounded concurrency so a long queue doesn't open a
 * dozen parallel downloads on mobile. Individual failures never reject the
 * whole preload — a track that can't load becomes a silent slot so the
 * shared battle timeline is never shifted by one client's network problem.
 */

export type PreloadResult = {
  buffers: Map<string, AudioBuffer>;
  failed: string[];
};

export type PreloadOptions = {
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (loaded: number, total: number) => void;
};

export async function preloadQueue(
  tracks: TrackAudioSource[],
  load: (track: TrackAudioSource, signal?: AbortSignal) => Promise<AudioBuffer>,
  opts: PreloadOptions = {},
): Promise<PreloadResult> {
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const buffers = new Map<string, AudioBuffer>();
  const failed: string[] = [];
  let settled = 0;
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < tracks.length) {
      if (opts.signal?.aborted) return;
      const track = tracks[cursor++];
      try {
        const buffer = await load(track, opts.signal);
        buffers.set(track.trackId, buffer);
      } catch {
        failed.push(track.trackId);
      } finally {
        settled += 1;
        opts.onProgress?.(settled, tracks.length);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(tracks.length, 1)) }, () => worker()),
  );
  return { buffers, failed };
}
