type IntroMedia = Pick<HTMLVideoElement, "muted" | "volume" | "play">;

/** Keep the existing timeline; browsers may require a tap for audible playback. */
export async function playIntroWithFallback(
  video: IntroMedia,
  allowMutedFallback: () => boolean,
): Promise<boolean> {
  video.volume = 1;
  video.muted = false;
  try {
    await video.play();
    return true;
  } catch {
    if (!allowMutedFallback()) return true;
    video.muted = true;
    try {
      await video.play();
      return true;
    } catch {
      return false;
    }
  }
}

/** Call directly from a user gesture so mobile browsers grant sound permission. */
export async function enableIntroAudio(video: IntroMedia): Promise<boolean> {
  video.volume = 1;
  video.muted = false;
  try {
    await video.play();
    return true;
  } catch {
    video.muted = true;
    return false;
  }
}