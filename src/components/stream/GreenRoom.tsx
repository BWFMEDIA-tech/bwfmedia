import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { setStageRole, removeStageParticipant } from "@/lib/stage.functions";
import { toast } from "sonner";
import type { StageParticipant } from "@/lib/useStageState";
import { SignedImg } from "@/components/ui/signed-img";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

export function GreenRoom({ streamId, participants }: { streamId: string | null; participants: StageParticipant[] }) {
  const green = participants.filter((p) => p.stage_role === "green_room");
  const promote = useServerFn(setStageRole);
  const remove = useServerFn(removeStageParticipant);

  const bringOnStage = async (uid: string) => {
    if (!streamId) return;
    try { await promote({ data: { streamId, targetUserId: uid, stageRole: "speaker" } }); toast.success("On stage"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const removeOne = async (uid: string) => {
    if (!streamId) return;
    try { await remove({ data: { streamId, targetUserId: uid } }); toast.success("Removed"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-white">GREEN ROOM</span>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: PURPLE }}>{green.length}</span>
        </div>
      </div>
      {green.length === 0 ? (
        <p className="text-xs text-white/40">No one in the green room.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {green.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <Link to="/user/$id" params={{ id: p.user_id }} className="shrink-0">
                {p.avatar_url ? (
                  <SignedImg src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{p.display_name ?? "Guest"}</div>
                <div className="truncate text-[10px] text-white/50">waiting backstage</div>
              </div>
              <button onClick={() => bringOnStage(p.user_id)} className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: PURPLE }}>
                Bring On Stage
              </button>
              <button onClick={() => removeOne(p.user_id)} className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/5">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}