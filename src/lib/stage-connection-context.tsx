import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react";
import { ParticipantEvent, RoomEvent, Track, type Participant } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

const ConnectedIdentitiesContext = createContext<Set<string> | null>(null);
const SpeakingIdentitiesContext = createContext<Set<string> | null>(null);
const STAGE_SPEAKING_TOPIC = "stage:speaking";
const SPEAKING_SIGNAL_TTL_MS = 900;

const globalSpeakingListeners = new Set<() => void>();
const providerSpeaking = new Map<symbol, Set<string>>();
const localSpeaking = new Map<string, boolean>();
let globalSpeakingSnapshot = new Set<string>();

function emitGlobalSpeaking() {
  const next = new Set<string>();
  providerSpeaking.forEach((ids) => ids.forEach((id) => next.add(id)));
  localSpeaking.forEach((isSpeaking, id) => {
    if (isSpeaking) next.add(id);
  });
  let same = next.size === globalSpeakingSnapshot.size;
  if (same) {
    for (const id of next) if (!globalSpeakingSnapshot.has(id)) { same = false; break; }
  }
  if (same) return;
  globalSpeakingSnapshot = next;
  globalSpeakingListeners.forEach((l) => l());
}

function setProviderSpeaking(source: symbol, ids: Set<string>) {
  providerSpeaking.set(source, new Set(ids));
  emitGlobalSpeaking();
}

function clearProviderSpeaking(source: symbol) {
  providerSpeaking.delete(source);
  emitGlobalSpeaking();
}

function setLocalSpeaking(identity: string | undefined | null, speaking: boolean) {
  if (!identity) return;
  if (speaking) localSpeaking.set(identity, true);
  else localSpeaking.delete(identity);
  emitGlobalSpeaking();
}

function subscribeGlobalSpeaking(cb: () => void) {
  globalSpeakingListeners.add(cb);
  return () => globalSpeakingListeners.delete(cb);
}

function getGlobalSpeakingSnapshot() {
  return globalSpeakingSnapshot;
}

export function useConnectedIdentities() {
  return useContext(ConnectedIdentitiesContext);
}

export function useSpeakingIdentities() {
  const contextSpeaking = useContext(SpeakingIdentitiesContext);
  const globalSpeaking = useSyncExternalStore(
    subscribeGlobalSpeaking,
    getGlobalSpeakingSnapshot,
    getGlobalSpeakingSnapshot,
  );
  return useMemo(() => {
    const merged = new Set<string>();
    contextSpeaking?.forEach((id) => merged.add(id));
    globalSpeaking.forEach((id) => merged.add(id));
    return merged;
  }, [contextSpeaking, globalSpeaking]);
}

/** Must be rendered inside a <LiveKitRoom>. Tracks identities currently
 * connected to the LiveKit room and exposes them via context so stage
 * tiles can show connecting/connected indicators. */
export function StageConnectionProvider({ children }: { children: React.ReactNode }) {
  const remotes = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const sourceRef = useRef<symbol>(Symbol("stage-speaking-provider"));

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
    const remoteSpeakingUntil = new Map<string, number>();
    const decoder = new TextDecoder();

    const recompute = () => {
      const next = new Set<string>();
      const now = Date.now();
      const consider = (p: Participant | undefined | null) => {
        if (p?.identity && p.isSpeaking) next.add(p.identity);
      };
      consider(room.localParticipant);
      room.remoteParticipants.forEach((p) => consider(p));
      remoteSpeakingUntil.forEach((expiresAt, identity) => {
        if (expiresAt > now) next.add(identity);
        else remoteSpeakingUntil.delete(identity);
      });
      setSpeakingIds((prev) => {
        if (prev.size === next.size) {
          let same = true;
          for (const id of next) if (!prev.has(id)) { same = false; break; }
          if (same) return prev;
        }
        return next;
      });
      setProviderSpeaking(sourceRef.current, next);
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
      if (p.identity) remoteSpeakingUntil.delete(p.identity);
      recompute();
    };
    const onData = (payload: Uint8Array, participant?: Participant, _kind?: unknown, topic?: string) => {
      if (topic !== STAGE_SPEAKING_TOPIC || !participant?.identity) return;
      try {
        const msg = JSON.parse(decoder.decode(payload)) as { speaking?: boolean; t?: number };
        if (msg?.speaking) remoteSpeakingUntil.set(participant.identity, Date.now() + SPEAKING_SIGNAL_TTL_MS);
        else remoteSpeakingUntil.delete(participant.identity);
        recompute();
      } catch {
        // Ignore malformed data packets from older clients.
      }
    };

    wire(room.localParticipant);
    room.remoteParticipants.forEach(wire);
    room.on(RoomEvent.ActiveSpeakersChanged, onActive);
    room.on(RoomEvent.ParticipantConnected, onConnected);
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected);
    room.on(RoomEvent.TrackSubscribed, onActive);
    room.on(RoomEvent.DataReceived, onData as any);
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
      room.off(RoomEvent.DataReceived, onData as any);
      perParticipantListeners.forEach((h, p) => p.off(ParticipantEvent.IsSpeakingChanged, h));
      perParticipantListeners.clear();
      clearProviderSpeaking(sourceRef.current);
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

/**
 * Browser-level speaking detector. LiveKit's active-speaker events are not
 * reliable on every mobile browser, so this samples the local mic track and
 * broadcasts a tiny lossy data packet when the user starts/stops speaking.
 */
export function LocalSpeakingSignalPublisher() {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  useEffect(() => {
    if (!room || !localParticipant || !isMicrophoneEnabled) {
      setLocalSpeaking(localParticipant?.identity, false);
      return;
    }

    let raf = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let stopped = false;
    let speaking = false;
    let lastSentAt = 0;
    let quietSince = 0;
    const encoder = new TextEncoder();

    const publish = (nextSpeaking: boolean, force = false) => {
      const now = Date.now();
      if (!force && speaking === nextSpeaking && (!nextSpeaking || now - lastSentAt < 500)) return;
      speaking = nextSpeaking;
      lastSentAt = now;
      setLocalSpeaking(localParticipant.identity, nextSpeaking);
      const payload = encoder.encode(JSON.stringify({ speaking: nextSpeaking, t: now }));
      room.localParticipant
        .publishData(payload, { reliable: false, topic: STAGE_SPEAKING_TOPIC })
        .catch(() => {});
    };

    const cleanupAudio = () => {
      cancelAnimationFrame(raf);
      if (retryTimer) clearTimeout(retryTimer);
      try { source?.disconnect(); } catch {}
      try { analyser?.disconnect(); } catch {}
      try { ctx?.close(); } catch {}
      source = null;
      analyser = null;
      ctx = null;
    };

    const start = () => {
      if (stopped) return;
      const pub = Array.from(localParticipant.trackPublications.values()).find(
        (p) => p.kind === Track.Kind.Audio && p.track,
      );
      const mediaStreamTrack = (pub?.track as any)?.mediaStreamTrack as MediaStreamTrack | undefined;
      if (!mediaStreamTrack) {
        retryTimer = setTimeout(start, 300);
        return;
      }
      try {
        ctx = new AudioContext();
        source = ctx.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.35;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!analyser || stopped) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const now = Date.now();
          const loud = rms > 0.018;
          if (loud) {
            quietSince = 0;
            publish(true);
          } else if (speaking) {
            quietSince ||= now;
            if (now - quietSince > 450) publish(false);
            else publish(true);
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        retryTimer = setTimeout(start, 500);
      }
    };

    start();
    return () => {
      stopped = true;
      publish(false, true);
      setLocalSpeaking(localParticipant.identity, false);
      cleanupAudio();
    };
  }, [room, localParticipant, isMicrophoneEnabled]);

  return null;
}