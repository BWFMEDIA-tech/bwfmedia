import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RoomContext } from "@livekit/components-react";
import { Room } from "livekit-client";
import { RaiseHandButton } from "@/components/stream/RaiseHandButton";
import { SelfMicrophoneButton } from "@/components/stream/SelfMicrophoneButton";
import { useAuth } from "@/lib/auth-context";

// Temporary check: is the mic control rendered beside "Leave stage"?
export const Route = createFileRoute("/mic-leave-preview")({
  head: () => ({ meta: [{ title: "Mic Leave Preview" }] }),
  component: MicLeavePreview,
});

const STREAM_ID = "d8b25ded-ae37-4eb7-a22e-40b70f64cea0";

function MicLeavePreview() {
  const auth = useAuth();
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    const r = new Room();
    // Pretend this participant may publish, exactly like a promoted speaker.
    (r.localParticipant as any).permissions = { canPublish: true };
    setRoom(r);
    return () => { r.disconnect(); };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-10 p-6">
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase text-white/60">outside a room</h2>
        <div id="case-outside">
          <RaiseHandButton streamId={STREAM_ID} auth={auth} />
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase text-white/60">inside a room</h2>
        <div id="case-inside">
          {room ? (
            <RoomContext.Provider value={room}>
              <RaiseHandButton streamId={STREAM_ID} auth={auth} />
            </RoomContext.Provider>
          ) : (
            <p className="text-sm text-white/50">connecting…</p>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase text-white/60">bare mic control, no room</h2>
        <div id="case-bare">
          <SelfMicrophoneButton />
        </div>
      </section>
    </div>
  );
}
