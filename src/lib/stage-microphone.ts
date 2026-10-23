/** Self controls never grant publishing or override a host's mute. Muting is always safe. */
export function canToggleStageMicrophone(microphoneEnabled: boolean, canPublish: boolean, hostMuted: boolean) {
  return microphoneEnabled || (canPublish && !hostMuted);
}

/** User IDs whose host mute is still in effect (muted_until in the future). */
export function activeMutedUserIds(rows: Iterable<{ user_id: string; muted_until: string | null }>, now = Date.now()) {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.muted_until && new Date(row.muted_until).getTime() > now) ids.add(row.user_id);
  }
  return ids;
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