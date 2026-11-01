import type { RoomOptions } from "livekit-client";
import { getSharedAudioContext } from "@/lib/audio/audio-clock";

/** Separate signal graphs on one hardware clock; never feed the local mic to speakers. */
export function getArenaRoomAudioOptions(): RoomOptions {
  const audioContext = getSharedAudioContext();
  return {
    webAudioMix: audioContext ? { audioContext } : false,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      voiceIsolation: false,
    },
    publishDefaults: { stopMicTrackOnMute: true },
  };
}