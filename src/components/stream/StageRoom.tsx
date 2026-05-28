import { useServerFn } from "@tanstack/react-start";
import { setStageRole, removeStageParticipant } from "@/lib/stage.functions";
import { toast } from "sonner";
import { Mic, MicOff, UserPlus, MoreHorizontal, Crown } from "lucide-react";
import type { StageParticipant } from "@/lib/useStageState";
import { cn } from "@/lib/utils";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

export function StageRoom({
  streamId,
  participants,
  canManage,
}: {
  streamId: string | null;
  participants: StageParticipant[];
  canManage: boolean;
}) {
  const setRole = useServerFn(setStageRole);
  const remove = useServerFn(removeStageParticipant);

  const host = participants.find((p) => p.stage_role === "host");
  const speakers = participants.filter((p) => p.stage_role === "speaker").slice(0, 7);
  const listeners = participants.filter((p) => p.stage_role === "listener").slice(0, 8);

  const demote = async (uid: string) => {
    if (!streamId) return;
    try { await setRole({ data: { streamId, targetUserId: uid, stageRole: "listener" } }); toast.success("Demoted to listener"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const kick = async (uid: string) => {
    if (!streamId) return;
    try { await remove({ data: { streamId, targetUserId: uid } }); toast.success("Removed"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const promote = async (uid: string) => {
    if (!streamId) return;
    try { await setRole({ data: { streamId, targetUserId: uid, stageRole: "speaker" } }); toast.success("Promoted"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4" style={{ color: PURPLE }} />
          <span className="text-sm font-bold tracking-wider text-white">STAGE ROOM</span>
          <span className="text-[11px] text-white/50">· {speakers.length + (host ? 1 : 0)} speakers · {listeners.length} listeners</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {host && <SpeakerBubble p={host} kind="host" canManage={false} />}
        {speakers.map((p) => (
          <SpeakerBubble key={p.id} p={p} kind="speaker" canManage={canManage} onDemote={() => demote(p.user_id)} onKick={() => kick(p.user_id)} />
        ))}
        {Array.from({ length: Math.max(0, 4 - speakers.length - (host ? 1 : 0)) }).map((_, i) => (
          <EmptySlot key={`s-${i}`} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {listeners.map((p) => (
          <ListenerBubble key={p.id} p={p} canManage={canManage} onPromote={() => promote(p.user_id)} />
        ))}
        <button className="flex aspect-square flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-white/20 text-white/40 hover:border-white/40 hover:text-white/60">
          <UserPlus className="h-5 w-5" />
          <span className="text-[9px]">Invite</span>
        </button>
      </div>
    </div>
  );
}

function SpeakerBubble({
  p,
  kind,
  canManage,
  onDemote,
  onKick,
}: {
  p: StageParticipant;
  kind: "host" | "speaker";
  canManage: boolean;
  onDemote?: () => void;
  onKick?: () => void;
}) {
  const ringColor = kind === "host" ? PURPLE : "#22c55e";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="absolute -mt-3 self-center">
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest text-white"
          style={{ background: kind === "host" ? PURPLE : "#16a34a" }}
        >
          {kind === "host" ? "HOST" : "SPEAKER"}
        </span>
      </div>
      <div
        className={cn("relative rounded-full p-1", "shadow-[0_0_24px]")}
        style={{ boxShadow: `0 0 24px ${ringColor}66`, background: `conic-gradient(${ringColor}, transparent 70%, ${ringColor})` }}
      >
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-full border-2 border-[#0d0d18] object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full border-2 border-[#0d0d18]" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
        )}
        <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0d0d18]" style={{ background: ringColor }}>
          <Mic className="h-3 w-3 text-white" />
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 text-xs font-bold text-white">
          {kind === "host" && <Crown className="h-3 w-3" style={{ color: PURPLE }} />}
          {p.display_name ?? "Speaker"}
        </div>
        <div className="text-[10px] text-white/50">{kind === "host" ? "Host" : "Speaker"}</div>
      </div>
      {canManage && kind === "speaker" && (
        <div className="flex gap-1">
          <button onClick={onDemote} className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/70 hover:bg-white/5">Demote</button>
          <button onClick={onKick} className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/70 hover:bg-white/5">Remove</button>
        </div>
      )}
    </div>
  );
}

function ListenerBubble({ p, canManage, onPromote }: { p: StageParticipant; canManage: boolean; onPromote: () => void }) {
  return (
    <button
      onClick={canManage ? onPromote : undefined}
      disabled={!canManage}
      className="group flex flex-col items-center gap-1 disabled:cursor-default"
      title={canManage ? "Promote to speaker" : undefined}
    >
      <div className="rounded-full p-0.5" style={{ background: `linear-gradient(135deg, ${BLUE}88, transparent)` }}>
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full border border-[#0d0d18] object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full border border-[#0d0d18]" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
        )}
      </div>
      <div className="text-[10px] font-medium text-white truncate max-w-[80px]">{p.display_name ?? "Listener"}</div>
      <div className="text-[9px] text-white/40">Listener</div>
    </button>
  );
}

function EmptySlot() {
  return (
    <div className="flex flex-col items-center gap-2 opacity-40">
      <div className="h-20 w-20 rounded-full border-2 border-dashed border-white/20" />
      <div className="text-[10px] text-white/40">Open slot</div>
    </div>
  );
}