import { useEffect, useSyncExternalStore } from "react";
import { useRoomContext } from "@livekit/components-react";
import { LocalAudioTrack, RoomEvent, Track, type RemoteTrackPublication } from "livekit-client";
import { arenaBroadcast } from "@/lib/useSharedAudioGraph";

export const ARENA_MUSIC_TRACK = "arena-music";

/**
 * Must render inside <LiveKitRoom>.
 * Host: publishes the Arena player's music as one live audio track.
 * Everyone: when that track is received, the local copy of the song is
 * silenced so the whole room hears the single broadcast (RoomAudioRenderer
 * plays it).
 */
export function ArenaMusicBroadcast() {
  const room = useRoomContext();
  const hostStream = useSyncExternalStore(arenaBroadcast.subscribe, arenaBroadcast.getHostStream, () => null);
  const localVolume = useSyncExternalStore(arenaBroadcast.subscribe, arenaBroadcast.getLocalVolume, () => 1);

  // Host publish
  useEffect(() => {
    if (!room || !hostStream) return;
    const mst = hostStream.getAudioTracks()[0];
    if (!mst) return;
    let published: LocalAudioTrack | null = null;
    let cancelled = false;
    const publish = async () => {
      if (published || cancelled || !room.localParticipant.permissions?.canPublish) return;
      try {
        // No duplicates: drop any earlier arena-music track (reconnect/re-mount).
        for (const pub of Array.from(room.localParticipant.trackPublications.values())) {
          if (pub.trackName === ARENA_MUSIC_TRACK && pub.track) {
            await room.localParticipant.unpublishTrack(pub.track as LocalAudioTrack, false).catch(() => {});
          }
        }
        if (published || cancelled) return;
        const t = new LocalAudioTrack(mst, undefined, false);
        await room.localParticipant.publishTrack(t, {
          name: ARENA_MUSIC_TRACK,
          source: Track.Source.ScreenShareAudio,
          dtx: false,
          red: false,
          audioPreset: { maxBitrate: 128_000 },
          forceStereo: true,
        } as any);
        if (cancelled) await room.localParticipant.unpublishTrack(t, false);
        else published = t;
      } catch (e) {
        console.warn("[arena-music] publish failed", e);
      }
    };
    void publish();
    room.on(RoomEvent.Connected, publish);
    room.on(RoomEvent.Reconnected, publish);
    return () => {
      cancelled = true;
      room.off(RoomEvent.Connected, publish);
      room.off(RoomEvent.Reconnected, publish);
      if (published) void room.localParticipant.unpublishTrack(published, false).catch(() => {});
    };
  }, [room, hostStream]);

  // Listener detect + apply this device's volume to the broadcast
  useEffect(() => {
    if (!room) return;
    const scan = () => {
      let active = false;
      room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          const rp = pub as RemoteTrackPublication;
          if (rp.trackName === ARENA_MUSIC_TRACK && rp.isSubscribed && rp.track) {
            // Only ONE copy is ever audible; a sending device hears its own local copy only.
            const audible = !active && !arenaBroadcast.getHostStream();
            (rp.track as any).setVolume?.(audible ? arenaBroadcast.getLocalVolume() : 0);
            active = true;
          }
        });
      });
      arenaBroadcast.setRemoteActive(active);
    };
    scan();
    const evs = [RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackUnpublished, RoomEvent.ParticipantDisconnected, RoomEvent.Disconnected, RoomEvent.Reconnected];
    evs.forEach((e) => room.on(e, scan));
    return () => {
      evs.forEach((e) => room.off(e, scan));
      arenaBroadcast.setRemoteActive(false);
    };
  }, [room, localVolume, hostStream]);

  return null;
}
