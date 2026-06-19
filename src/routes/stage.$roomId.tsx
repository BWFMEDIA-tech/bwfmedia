import { createFileRoute, useNavigate, ErrorComponent, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getStageRoom, setStageStatus } from "@/lib/stage-rooms.functions";
import { Users, Radio, Loader2, Mic } from "lucide-react";

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
    }
  }, [auth.user, navigate, room.id]);

  if (!auth.user) return null;

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
      <main className="mx-auto max-w-5xl p-6">
        <section className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-widest text-purple-300">
            <Mic className="h-3.5 w-3.5" /> INTERACTIVE STAGE
          </h2>
          {room.description && <p className="mb-4 text-sm text-white/70">{room.description}</p>}
          <div className="rounded-lg border border-white/10 bg-black/40 p-4 text-xs text-white/60">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">LiveKit room</div>
            <div className="font-mono text-white/80">{room.livekit_room}</div>
          </div>
          <p className="mt-4 text-[11px] text-white/40">
            Stage participation, queue, battles, and raise-hand wiring connect to this room.
            Audience count: {room.audience_count}
          </p>
        </section>
      </main>
    </div>
  );
}