/** Recover only the assigned artists' remote cameras, never audience media. */
export interface FreestyleCameraPublication {
  source: string;
  isSubscribed: boolean;
  setSubscribed: (subscribed: boolean) => void;
}

export interface FreestyleVideoParticipant {
  identity: string;
  trackPublications: Map<string, FreestyleCameraPublication>;
}

export function subscribeFreestyleCameras(
  participants: Iterable<FreestyleVideoParticipant>,
  artistIds: readonly (string | undefined)[],
) {
  const artists = new Set(artistIds.filter(Boolean));
  for (const participant of participants) {
    if (!artists.has(participant.identity)) continue;
    for (const publication of participant.trackPublications.values()) {
      if (publication.source === 'camera' && !publication.isSubscribed) {
        publication.setSubscribed(true);
      }
    }
  }
}