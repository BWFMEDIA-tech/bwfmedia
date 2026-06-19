import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import {
  getBroadcast, startBroadcast, endBroadcast,
  updateBroadcast, linkStageToBroadcast, unlinkStageFromBroadcast,
} from "@/lib/broadcasts.functions";
import { listMyStageRooms } from "@/lib/stage-rooms.functions";
import { Radio, Tv, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/broadcast/$broadcastId/manage")({
  head: () => ({
    meta: [
      { title: "Manage Broadcast — BWF Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => {
    const broadcast = await getBroadcast({ data: { id: params.broadcastId } });
    if (!broadcast) throw notFound();
    return { broadcast };
  },
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-screen place-items-center bg-black text-white p-8">
      <div className="max-w-md text-center">
        <p className="mb-4 text-sm text-white/60">{(error as Error).message}</p>
        <button onClick={reset} className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-black text-white">
      <p>Broadcast not found.</p>
    </div>
  ),
  component: ManageBroadcastPage,
});

function ManageBroadcastPage() {
  const { broadcast } = Route.useLoaderData();
  const auth = useAuth();
  const navigate = useNavigate();
  const start = useServerFn(startBroadcast);
  const end = useServerFn(endBroadcast);
  const update = useServerFn(updateBroadcast);
  const link = useServerFn(linkStageToBroadcast);
  const unlink = useServerFn(unlinkStageFromBroadcast);
  const listStages = useServerFn(listMyStageRooms);

  const [myStages, setMyStages] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [title, setTitle] = useState(broadcast.stream_title);
  const [desc, setDesc] = useState(broadcast.description ?? "");
  const [selectedStage, setSelectedStage] = useState("");

  useEffect(() => {
    if (!auth.user) {
      navigate({ to: "/login" });
      return;
    }
    listStages().then((rows) => setMyStages(rows as never)).catch(() => {});
  }, [auth.user, listStages, navigate]);

  if (!auth.user) return null;

  const isHost = auth.user.id === broadcast.host_id;
  if (!isHost) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-white">
        <p>You are not the host of this broadcast.</p>
      </div>
    );
  }

  const links = (broadcast as { stage_links?: Array<{ stage_room_id: string; role: string }> }).stage_links ?? [];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Tv className="h-5 w-5 text-blue-400" />
          <div>
            <h1 className="text-sm font-bold tracking-widest">MANAGE BROADCAST</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40">{broadcast.stream_status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/broadcast/$broadcastId"
            params={{ broadcastId: broadcast.id }}
            className="rounded bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
          >
            View
          </Link>
          {broadcast.stream_status === "scheduled" && (
            <button
              onClick={async () => {
                await start({ data: { id: broadcast.id } });
                toast.success("Broadcast started");
                navigate({ to: "/broadcast/$broadcastId/manage", params: { broadcastId: broadcast.id } });
              }}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-500"
            >
              <Radio className="mr-1 inline h-3 w-3" /> Go Live
            </button>
          )}
          {broadcast.stream_status === "live" && (
            <button
              onClick={async () => {
                await end({ data: { id: broadcast.id } });
                toast.success("Broadcast ended");
                navigate({ to: "/stream-studio" });
              }}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-500"
            >
              End
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-4 p-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#0d0d18] p-4">
          <h2 className="mb-3 text-[10px] font-bold tracking-widest text-white/60">DETAILS</h2>
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/40">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full rounded bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-blue-400"
          />
          <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/40">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            className="mb-3 w-full rounded bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-blue-400"
          />
          <button
            onClick={async () => {
              await update({ data: { id: broadcast.id, stream_title: title, description: desc } });
              toast.success("Saved");
            }}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500"
          >
            Save
          </button>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#0d0d18] p-4">
          <h2 className="mb-3 text-[10px] font-bold tracking-widest text-white/60">LINKED STAGES</h2>
          {links.length === 0 && <p className="mb-3 text-xs text-white/40">No stages linked.</p>}
          <ul className="mb-4 space-y-2">
            {links.map((l) => (
              <li key={l.stage_room_id} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <span className="flex-1 font-mono text-white/80">{l.stage_room_id}</span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">{l.role}</span>
                <button
                  onClick={async () => {
                    await unlink({ data: { broadcast_id: broadcast.id, stage_room_id: l.stage_room_id } });
                    toast.success("Unlinked");
                    navigate({ to: "/broadcast/$broadcastId/manage", params: { broadcastId: broadcast.id } });
                  }}
                  className="rounded p-1 hover:bg-white/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="flex-1 rounded bg-black/40 px-2 py-1.5 text-xs outline-none ring-1 ring-white/10"
            >
              <option value="">— select a stage —</option>
              {myStages.map((s) => (
                <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
              ))}
            </select>
            <button
              disabled={!selectedStage}
              onClick={async () => {
                await link({ data: { broadcast_id: broadcast.id, stage_room_id: selectedStage, role: "secondary" } });
                toast.success("Linked");
                setSelectedStage("");
                navigate({ to: "/broadcast/$broadcastId/manage", params: { broadcastId: broadcast.id } });
              }}
              className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-xs font-semibold hover:bg-purple-500 disabled:opacity-40"
            >
              <Plus className="h-3 w-3" /> Link
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}