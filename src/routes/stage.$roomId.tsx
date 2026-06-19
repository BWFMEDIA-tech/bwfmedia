import { createFileRoute, useNavigate, ErrorComponent, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getStageRoom, setStageStatus } from "@/lib/stage-rooms.functions";
import { getLiveKitToken } from "@/lib/livekit.functions";
import { StageAudioShell } from "@/components/stream/StageAudioShell";
import { LiveStage } from "@/components/stream/LiveStage";
import { Users, Radio, Loader2 } from "lucide-react";

export const Route = createFileRoute("/stage/$roomId")({
  head: () => ({
    meta: [
      { title: "Stage Room — BWF Network" },
      { name: "description", content: "Interactive live stage with hosts, artists, and audience." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => {
    const room = await getStageRoom({ data: { id: params.roomId } });
    if (!room) throw notFound();
    return { room };
  },
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-screen place-items-center bg-black text-white p-8">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-bold">Stage unavailable</h1>
        <p className="mb-4 text-sm text-white/60">{(error as Error).message}</p>
        <button onClick={reset} className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-black text-white">
      <p>Stage room not found.</p>
    </div>
  ),
  component: StagePage,
});

function StagePage() {
  const { room } = Route.useLoaderData();
  const auth = useAuth();
  const navigate = useNavigate();
  const fetchToken = useServerFn(getLiveKitToken);
  const updateStatus = useServerFn(setStageStatus);
  const [token, setToken] = useState<string | null>(null);

  const isHost = auth.user?.id === room.host_id;

  useEffect(() => {
    if (!auth.user) {
      navigate({ to: "/login", search: { redirect: `/stage/${room.id}` } as never });
      return;
    }
    let cancelled = false;
    fetchToken({ data: { roomName: room.livekit_room, canPublish: isHost } })
      .then((res) => { if (!cancelled) setToken((res as { token: string }).token); })
      .catch((e) => console.error("token fetch failed", e));
    return () => { cancelled = true; };
  }, [auth.user, fetchToken, room.id, room.livekit_room, isHost, navigate]);

  if (!auth.user) return null;
  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-purple-400" />
          <div>
            <h1 className="text-sm font-bold tracking-widest">{room.title}</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Stage · {room.status}
            </p>
          </div>
        </div>
        {isHost && (
          <div className="flex items-center gap-2">
            {room.status === "idle" && (
              <button
                onClick={async () => {
                  await updateStatus({ data: { id: room.id, status: "live" } });
                  navigate({ to: "/stage/$roomId", params: { roomId: room.id } });
                }}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold hover:bg-green-500"
              >
                <Radio className="mr-1 inline h-3 w-3" /> Go Live
              </button>
            )}
            {room.status === "live" && (
              <button
                onClick={async () => {
                  await updateStatus({ data: { id: room.id, status: "ended" } });
                  navigate({ to: "/stream-studio" });
                }}
                className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-500"
              >
                End Stage
              </button>
            )}
          </div>
        )}
      </header>
      <main className="p-4">
        <StageAudioShell token={token} roomName={room.livekit_room} canPublish={isHost}>
          <LiveStage token={token} roomName={room.livekit_room} canPublish={isHost} />
        </StageAudioShell>
      </main>
    </div>
  );
}