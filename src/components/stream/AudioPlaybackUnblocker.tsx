import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Unlock receiving audio without requesting or enabling a microphone. */
export function AudioPlaybackUnblocker() {
  const room = useRoomContext();
  const [blocked, setBlocked] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const update = () => setBlocked(!room.canPlaybackAudio);
    update();
    room.on(RoomEvent.AudioPlaybackStatusChanged, update);
    room.on(RoomEvent.Connected, update);
    room.on(RoomEvent.Reconnected, update);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, update);
      room.off(RoomEvent.Connected, update);
      room.off(RoomEvent.Reconnected, update);
    };
  }, [room]);

  if (!blocked) return null;
  return (
    <Button
      variant="outline"
      className="relative z-10 mx-auto flex gap-2 border-primary text-primary"
      disabled={starting}
      onClick={async () => {
        setStarting(true);
        try {
          await room.startAudio();
          setBlocked(!room.canPlaybackAudio);
        } catch {
          toast.error("Couldn't enable sound. Please try again.");
        } finally {
          setStarting(false);
        }
      }}
    >
      <Volume2 className="h-4 w-4" /> {starting ? "Enabling sound…" : "Enable sound"}
    </Button>
  );
}