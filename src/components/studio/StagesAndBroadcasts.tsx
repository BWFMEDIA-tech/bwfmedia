import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Users, Tv, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import {
  listMyStageRooms,
  createStageRoom,
} from "@/lib/stage-rooms.functions";
import {
  listMyBroadcasts,
  createBroadcast,
} from "@/lib/broadcasts.functions";

type Stage = { id: string; title: string; status: string; audience_count: number };
type Broadcast = { id: string; stream_title: string; stream_status: string; viewer_count: number };

/**
 * Independent launcher for Stage Rooms and Broadcasts.
 *
 * Stage Rooms = interactive participation layer.
 * Broadcasts  = distribution / viewing layer.
 *
 * Each side operates against its own database entity. Starting a broadcast
 * never disconnects a stage; ending a broadcast never ends a stage.
 */
export function StagesAndBroadcasts() {
  const navigate = useNavigate();
  const listStages = useServerFn(listMyStageRooms);
  const listBroadcasts = useServerFn(listMyBroadcasts);
  const newStage = useServerFn(createStageRoom);
  const newBroadcast = useServerFn(createBroadcast);

  const [stages, setStages] = useState<Stage[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [s, b] = await Promise.all([listStages(), listBroadcasts()]);
      setStages(s as never);
      setBroadcasts(b as never);
    } catch (e) {
      console.warn("load failed", e);
    }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* STAGE ROOM PANEL */}
      <section className="rounded-2xl border border-purple-500/20 bg-[#0d0d18] p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-purple-300">
            <Users className="h-3.5 w-3.5" /> STAGE ROOMS
          </h2>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await newStage({ data: {} }) as { id: string };
                toast.success("Stage room created");
                navigate({ to: "/stage/$roomId", params: { roomId: r.id } });
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 text-[10px] font-bold tracking-widest hover:bg-purple-500 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> NEW STAGE
          </button>
        </header>
        <p className="mb-3 text-[10px] text-white/40">
          Interactive participation · hosts, artists, guests, audience
        </p>
        <ul className="space-y-1.5">
          {stages.length === 0 && (
            <li className="rounded border border-dashed border-white/10 p-3 text-center text-[11px] text-white/40">
              No stage rooms yet.
            </li>
          )}
          {stages.map((s) => (
            <li key={s.id}>
              <Link
                to="/stage/$roomId"
                params={{ roomId: s.id }}
                className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
              >
                <span className="truncate font-semibold text-white">{s.title}</span>
                <span className="ml-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                  <StatusDot status={s.status} />
                  {s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* BROADCAST PANEL */}
      <section className="rounded-2xl border border-blue-500/20 bg-[#0d0d18] p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-blue-300">
            <Tv className="h-3.5 w-3.5" /> BROADCASTS
          </h2>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await newBroadcast({ data: {} }) as { id: string };
                toast.success("Broadcast created");
                navigate({ to: "/broadcast/$broadcastId/manage", params: { broadcastId: r.id } });
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[10px] font-bold tracking-widest hover:bg-blue-500 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> NEW BROADCAST
          </button>
        </header>
        <p className="mb-3 text-[10px] text-white/40">
          One-to-many distribution · viewers, playback source, monetization
        </p>
        <ul className="space-y-1.5">
          {broadcasts.length === 0 && (
            <li className="rounded border border-dashed border-white/10 p-3 text-center text-[11px] text-white/40">
              No broadcasts yet.
            </li>
          )}
          {broadcasts.map((b) => (
            <li key={b.id}>
              <Link
                to="/broadcast/$broadcastId/manage"
                params={{ broadcastId: b.id }}
                className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
              >
                <span className="truncate font-semibold text-white">{b.stream_title}</span>
                <span className="ml-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50">
                  {b.stream_status === "live" && <Radio className="h-3 w-3 animate-pulse text-red-400" />}
                  <StatusDot status={b.stream_status} />
                  {b.stream_status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "live" ? "bg-red-500" : status === "ended" ? "bg-white/30" : "bg-amber-400";
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}