import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { toast } from "sonner";

/**
 * Single LiveKit room that survives Broadcast / Stage / Play mode switches.
 *
 * The host (and any connected viewer) joins this room once. Mode toggles
 * only swap the inner UI — `LiveStage` and `StageAudioShell` are rendered
 * with `embedded` so they re-use this room context instead of opening a
 * fresh `<LiveKitRoom>` and dropping participants on every switch.
 */
export function PersistentLiveRoom({
  token,
  serverUrl,
  children,
}: {
  token: string;
  serverUrl: string;
  children: React.ReactNode;
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={false}
      video={false}
      onError={(e) =>
        toast.error(`Live session error: ${(e as any)?.message ?? e}`)
      }
      className="contents"
    >
      <RoomAudioRenderer />
      {children}
    </LiveKitRoom>
  );
}