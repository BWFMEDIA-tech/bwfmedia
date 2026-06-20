import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { ParticipantEvent, RoomEvent, type Participant } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

const ConnectedIdentitiesContext = createContext<Set<string> | null>(null);
const SpeakingIdentitiesContext = createContext<Set<string> | null>(null);

export function useConnectedIdentities() {
  return useContext(ConnectedIdentitiesContext);
}

export function useSpeakingIdentities() {
  return useContext(SpeakingIdentitiesContext) ?? new Set<string>();
}

/** Must be rendered inside a <LiveKitRoom>. Tracks identities currently
 * connected to the LiveKit room and exposes them via context so stage
 * tiles can show connecting/connected indicators. */
export function StageConnectionProvider({ children }: { children: React.ReactNode }) {
  const remotes = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());

  // Track speaking state for EVERY participant (host, co-host, guests, and
  // the local participant). LiveKit's ActiveSpeakersChanged sometimes omits
  // the local participant, so we also subscribe per-participant to
  // IsSpeakingChanged to guarantee the spotlight ring/pulse animation lights
  // up for whoever is actually talking.
  useEffect(() => {
    if (!room) return;

    const recompute = () => {
      const next = new Set<string>();
      const consider = (p: Participant | undefined | null) => {
        if (p?.identity && p.isSpeaking) next.add(p.identity);
      };
      consider(room.localParticipant);
      room.remoteParticipants.forEach((p) => consider(p));
      setSpeakingIds(next);
    };

    const wired = new WeakSet<Participant>();
    const wire = (p: Participant) => {
      if (wired.has(p)) return;
      wired.add(p);
      p.on(ParticipantEvent.IsSpeakingChanged, recompute);
    };
    const onActive = (_speakers: Participant[]) => recompute();
    const onConnected = (p: Participant) => { wire(p); recompute(); };

    wire(room.localParticipant);
    room.remoteParticipants.forEach(wire);
    room.on(RoomEvent.ActiveSpeakersChanged, onActive);
    room.on(RoomEvent.ParticipantConnected, onConnected);
    recompute();

    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, onActive);
      room.off(RoomEvent.ParticipantConnected, onConnected);
      // Per-participant listeners detach automatically when participants
      // disconnect; the WeakSet lets them be GC'd with the participant.
    };
  }, [room]);

  const set = useMemo(() => {
    const ids = new Set<string>();
    remotes?.forEach((r) => r.identity && ids.add(r.identity));
    if (localParticipant?.identity) ids.add(localParticipant.identity);
    return ids;
  }, [remotes, localParticipant?.identity]);

  return (
    <ConnectedIdentitiesContext.Provider value={set}>
      <SpeakingIdentitiesContext.Provider value={speakingIds}>
        {children}
      </SpeakingIdentitiesContext.Provider>
    </ConnectedIdentitiesContext.Provider>
  );
}