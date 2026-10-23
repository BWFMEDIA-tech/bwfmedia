import { useRoomContext } from "@livekit/components-react";
import { useEffect, useState } from "react";
import { RoomEvent, Track } from "livekit-client";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { activeMutedUserIds } from "@/lib/stage-microphone";

/**
 * Enforces host moderation (stage_participants.muted_until) inside a video
 * LiveKit room. The audio-only stage already has StageMicSync +
 * MutedSpeakerGuard; video stages mount this instead so "Mute all" and
 * per-person host mutes actually silence people:
 *  - the muted person's own microphone is switched off, and kept off if
 *    their device (or a self-unmute tap) tries to re-enable it;
 *  - their audio is silenced for every other viewer even if their device
 *    keeps publishing.
 * Mount once inside LiveKitRoom when the streamId is known.
 */
export function StageMuteEnforcement({ streamId }: { streamId: string }) {
  const room = useRoomContext();
  const [muted, setMuted] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("stage_participants")
        .select("user_id, muted_until")
        .eq("stream_id", streamId)
        .not("muted_until", "is", null);
      if (!active) return;
      setMuted(activeMutedUserIds(data ?? []));
    };
    load();
    const ch = supabase
      .channel(`stage-mute-enforce-${streamId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stage_participants", filter: `stream_id=eq.${streamId}` },
        load,
      )
      .subscribe();
    const t = setInterval(load, 30_000);
    return () => { active = false; clearInterval(t); supabase.removeChannel(ch); };
  }, [streamId]);

  // Silence muted speakers for everyone watching.
  useEffect(() => {
    if (!room) return;
    const apply = () => {
      room.remoteParticipants.forEach((p) => {
        const silence = muted.has(p.identity);
        p.audioTrackPublications.forEach((pub) => {
          if (pub.source === Track.Source.Microphone) pub.setEnabled(!silence);
        });
      });
    };
    apply();
    room.on(RoomEvent.TrackPublished, apply);
    room.on(RoomEvent.TrackSubscribed, apply);
    room.on(RoomEvent.ParticipantConnected, apply);
    return () => {
      room.off(RoomEvent.TrackPublished, apply);
      room.off(RoomEvent.TrackSubscribed, apply);
      room.off(RoomEvent.ParticipantConnected, apply);
    };
  }, [room, muted]);

  // Switch off the local mic while host-muted, and keep it off if the
  // device or a self-unmute tap tries to re-enable it.
  useEffect(() => {
    if (!room) return;
    const lp = room.localParticipant;
    const enforce = () => {
      if (muted.has(lp.identity) && lp.isMicrophoneEnabled) {
        lp.setMicrophoneEnabled(false).catch(() => {});
        toast.info("The host has muted you");
      }
    };
    enforce();
    room.on(RoomEvent.LocalTrackPublished, enforce);
    room.on(RoomEvent.TrackUnmuted, enforce);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, enforce);
      room.off(RoomEvent.TrackUnmuted, enforce);
    };
  }, [room, muted]);

  return null;
}
