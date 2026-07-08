/**
 * Single-active playback guard.
 *
 * Every audio source in the app (ImmersivePlayer, the global mini-player,
 * NowPlayingMini, NowPlayingHeader, podcast mode, audience preview, artist
 * profile preview) registers its HTMLAudioElement here. When any element
 * fires `play`, the bus pauses every other registered element so only one
 * stream is ever audible at a time — even across routes/components that
 * don't know about each other.
 */

const registry = new Set<HTMLAudioElement>();
let active: HTMLAudioElement | null = null;

function pauseOthers(except: HTMLAudioElement) {
  for (const other of registry) {
    if (other === except) continue;
    stopAndReset(other);
  }
}

function stopAndReset(el: HTMLAudioElement) {
  try { el.pause(); } catch { /* ignore */ }
  try { el.currentTime = 0; } catch { /* ignore */ }
}

/**
 * Register an audio element with the bus. Returns an unregister fn — call it
 * on unmount / element teardown to avoid leaking listeners.
 */
export function registerAudioElement(el: HTMLAudioElement | null | undefined): () => void {
  if (!el) return () => {};
  if (registry.has(el)) return () => unregister(el);
  registry.add(el);
  const onPlay = () => {
    active = el;
    pauseOthers(el);
  };
  const onPause = () => {
    if (active === el) active = null;
  };
  el.addEventListener("play", onPlay);
  el.addEventListener("pause", onPause);
  (el as HTMLAudioElement & { __busCleanup?: () => void }).__busCleanup = () => {
    el.removeEventListener("play", onPlay);
    el.removeEventListener("pause", onPause);
  };
  return () => unregister(el);
}

function unregister(el: HTMLAudioElement) {
  const cleanup = (el as HTMLAudioElement & { __busCleanup?: () => void }).__busCleanup;
  cleanup?.();
  registry.delete(el);
  if (active === el) active = null;
}

/** Force-pause every registered audio element except (optionally) one. */
export function pauseAllAudio(except?: HTMLAudioElement | null) {
  for (const el of registry) {
    if (except && el === except) continue;
    if (!el.paused) {
      try { el.pause(); } catch { /* ignore */ }
    }
  }
}

/** Stop + rewind every registered audio element except (optionally) one. */
export function stopAndResetAllAudio(except?: HTMLAudioElement | null) {
  for (const el of registry) {
    if (except && el === except) continue;
    stopAndReset(el);
  }
  if (!except || active !== except) active = null;
}

/** Stop + rewind one audio element. */
export function stopAndResetAudio(el: HTMLAudioElement | null | undefined) {
  if (!el) return;
  stopAndReset(el);
  if (active === el) active = null;
}

export function getActiveAudio(): HTMLAudioElement | null {
  return active;
}