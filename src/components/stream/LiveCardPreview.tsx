import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getLiveKitToken } from "@/lib/livekit.functions";
import { schedulePreviewEnd } from "@/lib/live-preview";
import { useAuth } from "@/lib/auth-context";

/** Read-only, camera-only connection; never replaces an existing host identity. */
export function LiveCardPreview({ roomName, hostId }: { roomName: string; hostId: string }) {
  const auth = useAuth();
  const tokenFn = useServerFn(getLiveKitToken);
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [finished, setFinished] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), { threshold: 0.3 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!auth.user || !visible || finished) return;
    let cancelled = false;
    let disconnect = () => {};
    let cancelEnd = () => {};
    const end = () => { setFinished(true); setPlaying(false); disconnect(); };
    // A camera-less/audio-only room or unavailable connection keeps its thumbnail.
    const connectionTimeout = setTimeout(end, 15_000);
    const start = async () => {
      const { Room, RoomEvent, Track } = await import("livekit-client");
      if (cancelled) return;
      const room = new Room({ adaptiveStream: true, dynacast: true });
      disconnect = () => { void room.disconnect(); };
      const subscribeHost = () => {
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            publication.setSubscribed(participant.identity === hostId && publication.source === Track.Source.Camera);
          }
        }
      };
      room.on(RoomEvent.TrackPublished, subscribeHost);
      room.on(RoomEvent.ParticipantConnected, subscribeHost);
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        const element = video.current;
        if (cancelled || !element || participant.identity !== hostId || publication.source !== Track.Source.Camera) return;
        track.attach(element);
        void element.play().catch(end);
      });
      room.on(RoomEvent.TrackUnsubscribed, () => { setPlaying(false); });
      room.on(RoomEvent.Disconnected, end);
      const credentials = await tokenFn({ data: { roomName, preview: true } });
      if (cancelled) return;
      await room.connect(credentials.wsUrl, credentials.token, { autoSubscribe: false });
      if (cancelled) { disconnect(); return; }
      subscribeHost();
    };
    const element = video.current;
    const onPlaying = () => {
      if (cancelled) return;
      clearTimeout(connectionTimeout);
      setPlaying(true);
      cancelEnd();
      cancelEnd = schedulePreviewEnd(end);
    };
    element?.addEventListener("playing", onPlaying, { once: true });
    void start().catch(() => { if (!cancelled) end(); });
    return () => {
      cancelled = true;
      clearTimeout(connectionTimeout);
      cancelEnd();
      element?.removeEventListener("playing", onPlaying);
      disconnect();
      setPlaying(false);
      setFinished(true);
    };
  }, [auth.user?.id, visible, finished, roomName, hostId, tokenFn]);

  return <div ref={container} className="pointer-events-none absolute inset-0">
    <video ref={video} muted autoPlay playsInline aria-label="Live broadcaster preview"
      className={`h-full w-full object-cover ${playing && !finished ? "opacity-100" : "opacity-0"}`} />
  </div>;
}