import { createContext, useContext, useMemo } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";

const ConnectedIdentitiesContext = createContext<Set<string>>(new Set());

export function useConnectedIdentities() {
  return useContext(ConnectedIdentitiesContext);
}

/** Must be rendered inside a <LiveKitRoom>. Tracks identities currently
 * connected to the LiveKit room and exposes them via context so stage
 * tiles can show connecting/connected indicators. */
export function StageConnectionProvider({ children }: { children: React.ReactNode }) {
  const remotes = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();

  const set = useMemo(() => {
    const ids = new Set<string>();
    remotes?.forEach((r) => r.identity && ids.add(r.identity));
    if (localParticipant?.identity) ids.add(localParticipant.identity);
    return ids;
  }, [remotes, localParticipant?.identity]);

  return (
    <ConnectedIdentitiesContext.Provider value={set}>
      {children}
    </ConnectedIdentitiesContext.Provider>
  );
}