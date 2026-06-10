import { createContext, useContext, useMemo } from "react";
import { useLocalParticipant, useRemoteParticipants, useIsSpeaking } from "@livekit/components-react";

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
  const localSpeaking = useIsSpeaking(localParticipant);

  const set = useMemo(() => {
    const ids = new Set<string>();
    remotes?.forEach((r) => r.identity && ids.add(r.identity));
    if (localParticipant?.identity) ids.add(localParticipant.identity);
    return ids;
  }, [remotes, localParticipant?.identity]);

  const speakingSet = useMemo(() => {
    const ids = new Set<string>();
    remotes?.forEach((r) => {
      if (r.isSpeaking && r.identity) ids.add(r.identity);
    });
    if (localSpeaking && localParticipant?.identity) ids.add(localParticipant.identity);
    return ids;
    // re-evaluate whenever any remote's speaking flag toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remotes, remotes?.map((r) => r.isSpeaking).join(","), localSpeaking, localParticipant?.identity]);

  return (
    <ConnectedIdentitiesContext.Provider value={set}>
      <SpeakingIdentitiesContext.Provider value={speakingSet}>
        {children}
      </SpeakingIdentitiesContext.Provider>
    </ConnectedIdentitiesContext.Provider>
  );
}