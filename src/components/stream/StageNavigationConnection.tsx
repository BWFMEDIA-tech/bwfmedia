import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { setStageNavigationConnection } from "@/lib/stage-navigation-connection";

/** Local transport status suppresses the host indicator; it never ends a stream. */
export function StageNavigationConnection({ streamId }: { streamId: string }) {
  const room = useRoomContext();
  useEffect(() => {
    const update = () => setStageNavigationConnection({ streamId, connected: room.state === ConnectionState.Connected });
    update();
    room.on(RoomEvent.ConnectionStateChanged, update);
    return () => { room.off(RoomEvent.ConnectionStateChanged, update); setStageNavigationConnection(null); };
  }, [room, streamId]);
  return null;
}