import { useServerFn } from "@tanstack/react-start";
import { respondHand } from "@/lib/stage.functions";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, X as XIcon } from "lucide-react";
import type { HandRequest } from "@/lib/useStageState";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

export function RaiseHandPanel({ hands }: { hands: HandRequest[] }) {
  const respond = useServerFn(respondHand);
  const act = async (requestId: string, action: "accept_stage" | "accept_green_room" | "decline") => {
    try {
      await respond({ data: { requestId, action } });
      toast.success(action === "decline" ? "Declined" : action === "accept_stage" ? "Promoted to stage" : "Sent to green room");
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-white">RAISE HAND REQUESTS</span>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: PURPLE }}>
            {hands.length}
          </span>
        </div>
      </div>
      {hands.length === 0 ? (
        <p className="text-xs text-white/40">No pending requests.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {hands.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              {r.avatar_url ? (
                <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold text-white">
                  {r.display_name ?? "Listener"}
                  <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />
                </div>
                <div className="truncate text-[10px] text-white/50">wants to join the stage</div>
              </div>
              <button onClick={() => act(r.id, "accept_stage")} className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: PURPLE }}>
                Allow
              </button>
              <button onClick={() => act(r.id, "accept_green_room")} className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/5">
                Green
              </button>
              <button onClick={() => act(r.id, "decline")} className="rounded-md p-1 text-white/50 hover:text-white">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {hands.length > 5 && (
        <button className="mt-3 flex w-full items-center justify-between text-xs text-white/70 hover:text-white">
          View all requests <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}