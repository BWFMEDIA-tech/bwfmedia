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
  // the local participant). For audience viewers, LiveKit fires
  // ActiveSpeakersChanged on the room as remote hosts start talking — but
  // the per-participant IsSpeakingChanged event is what we rely on for the
  // ring/pulse animation, because ActiveSpeakers only includes the loudest
  // few. We re-wire whenever the remote-participant list or local
  // participant changes (joins after the viewer, reconnects, etc.) so an
  // audience viewer sees the animation regardless of who joined first.
  useEffect(() => {
    if (!room) return;

    const recompute = () => {
      const next = new Set<string>();
      const consider = (p: Participant | undefined | null) => {
        if (p?.identity && p.isSpeaking) next.add(p.identity);
      };
      consider(room.localParticipant);
      room.remoteParticipants.forEach((p) => consider(p));
      setSpeakingIds((prev) => {
        if (prev.size === next.size) {
          let same = true;
          for (const id of next) if (!prev.has(id)) { same = false; break; }
          if (same) return prev;
        }
        return next;
      });
    };

    const perParticipantListeners = new Map<Participant, () => void>();
    const wire = (p: Participant | undefined | null) => {
      if (!p || perParticipantListeners.has(p)) return;
      const handler = () => recompute();
      p.on(ParticipantEvent.IsSpeakingChanged, handler);
      perParticipantListeners.set(p, handler);
    };
    const onActive = () => recompute();
    const onConnected = (p: Participant) => { wire(p); recompute(); };
    const onDisconnected = (p: Participant) => {
      const h = perParticipantListeners.get(p);
      if (h) { p.off(ParticipantEvent.IsSpeakingChanged, h); perParticipantListeners.delete(p); }
      recompute();
    };

    wire(room.localParticipant);
    room.remoteParticipants.forEach(wire);
    room.on(RoomEvent.ActiveSpeakersChanged, onActive);
    room.on(RoomEvent.ParticipantConnected, onConnected);
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected);
    room.on(RoomEvent.TrackSubscribed, onActive);
    recompute();

    // Fallback poller. Some browsers (notably iOS Safari and Firefox on
    // Linux) don't fire `IsSpeakingChanged` reliably for the local
    // participant, and `ActiveSpeakersChanged` only lists the loudest
    // couple of talkers. Poll every 200 ms so the pulse ring always
    // reflects the current `isSpeaking` state for everyone in the room.
    const pollId = window.setInterval(recompute, 200);

    return () => {
      window.clearInterval(pollId);
      room.off(RoomEvent.ActiveSpeakersChanged, onActive);
      room.off(RoomEvent.ParticipantConnected, onConnected);
      room.off(RoomEvent.ParticipantDisconnected, onDisconnected);
      room.off(RoomEvent.TrackSubscribed, onActive);
      perParticipantListeners.forEach((h, p) => p.off(ParticipantEvent.IsSpeakingChanged, h));
      perParticipantListeners.clear();
    };
    // Re-run when the remote participant list or local participant changes
    // so newly arrived hosts get per-participant listeners attached.
  }, [room, remotes, localParticipant]);

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