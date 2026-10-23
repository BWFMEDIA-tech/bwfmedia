/** Self controls never grant publishing or override a host's mute. Muting is always safe. */
export function canToggleStageMicrophone(microphoneEnabled: boolean, canPublish: boolean, hostMuted: boolean) {
  return microphoneEnabled || (canPublish && !hostMuted);
}

/** A muted publication is intentional, not a failed microphone to restart. */
export function shouldRestoreStageMicrophone(publications: Iterable<{
  source?: string;
  track?: { isMuted?: boolean; mediaStreamTrack?: { readyState: string } } | null;
}>) {
  return !Array.from(publications).some((publication) =>
    publication.source === "microphone" && !!publication.track &&
    (publication.track.isMuted === true || publication.track.mediaStreamTrack?.readyState !== "ended"),
  );
}