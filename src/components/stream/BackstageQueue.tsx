import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reorderQueue, removeFromQueue, setQueueStatus } from "@/lib/queue.functions";
import { toast } from "sonner";
import { GripVertical, X as XIcon, ChevronRight } from "lucide-react";
import type { QueueEntry } from "@/lib/useStageState";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

export function BackstageQueue({ streamId, queue, canManage }: { streamId: string | null; queue: QueueEntry[]; canManage: boolean }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const reorder = useServerFn(reorderQueue);
  const remove = useServerFn(removeFromQueue);
  const setStatus = useServerFn(setQueueStatus);

  const onDrop = async (targetId: string) => {
    if (!dragging || !streamId || dragging === targetId) return;
    const ids = queue.map((q) => q.id);
    const from = ids.indexOf(dragging);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragging);
    setDragging(null);
    try {
      await reorder({ data: { streamId, orderedIds: next } });
    } catch (e: any) {
      toast.error(e?.message ?? "Reorder failed");
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-white">BACKSTAGE QUEUE</span>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: PURPLE }}>{queue.length}</span>
        </div>
      </div>
      {queue.length === 0 ? (
        <p className="text-xs text-white/40">Queue is empty.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {queue.slice(0, 6).map((q, i) => (
            <div
              key={q.id}
              draggable={canManage}
              onDragStart={() => setDragging(q.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(q.id)}
              className="flex items-center gap-3 rounded-lg px-1 hover:bg-white/[0.02]"
            >
              <span className="w-4 text-xs font-bold text-white/40">{i + 1}</span>
              {q.avatar_url ? (
                <img src={q.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{q.display_name ?? "Artist"}</div>
                <div className="truncate text-[10px] text-white/50">{q.genre ?? "Track"} · {q.status}</div>
              </div>
              {canManage && (
                <>
                  <button
                    onClick={() => streamId && setStatus({ data: { streamId, queueId: q.id, status: "on_stage" } }).then(() => toast.success("Marked on stage")).catch((e) => toast.error(e?.message))}
                    className="rounded-md px-2 py-1 text-[10px] font-semibold text-white"
                    style={{ background: PURPLE }}
                  >
                    Stage
                  </button>
                  <button
                    onClick={() => streamId && remove({ data: { streamId, queueId: q.id } }).then(() => toast.success("Removed")).catch((e) => toast.error(e?.message))}
                    className="rounded-md p-1 text-white/50 hover:text-white"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="h-4 w-4 cursor-grab text-white/30" />
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {queue.length > 6 && (
        <button className="mt-3 flex w-full items-center justify-between text-xs text-white/70 hover:text-white">
          View full queue <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}