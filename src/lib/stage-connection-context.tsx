import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { RoomEvent, type Participant } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

const ConnectedIdentitiesContext = createContext<Set<string>>(new Set());
const SpeakingIdentitiesContext = createContext<Set<string>>(new Set());

export function useConnectedIdentities() {
  return useContext(ConnectedIdentitiesContext);
}

export function useSpeakingIdentities() {
  return useContext(SpeakingIdentitiesContext);
}

/** Must be rendered inside a <LiveKitRoom>. Tracks identities currently
 * connected to the LiveKit room and exposes them via context so stage
 * tiles can show connecting/connected indicators. */
export function StageConnectionProvider({ children }: { children: React.ReactNode }) {
  const remotes = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!room) return;
    const handler = (speakers: Participant[]) => {
      setSpeakingIds(new Set(speakers.map((s) => s.identity).filter(Boolean)));
    };
    room.on(RoomEvent.ActiveSpeakersChanged, handler);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handler);
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