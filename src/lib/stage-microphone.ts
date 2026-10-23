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