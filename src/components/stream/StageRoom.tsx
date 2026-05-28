import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setStageRole, removeStageParticipant } from "@/lib/stage.functions";
import { toast } from "sonner";
import { Mic, UserPlus, Crown, X } from "lucide-react";
import type { StageParticipant } from "@/lib/useStageState";
import { cn } from "@/lib/utils";

const MAX_HOSTS = 5;
const MAX_GUESTS = 5;

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
  const [invite, setInvite] = useState<null | "host" | "speaker">(null);

  const hosts = participants.filter((p) => p.stage_role === "host").slice(0, MAX_HOSTS);
  const guests = participants.filter((p) => p.stage_role === "speaker").slice(0, MAX_GUESTS);
  const audience = participants.filter(
    (p) => p.stage_role === "listener" || p.stage_role === "green_room",
  );

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
  const promote = async (uid: string, role: "host" | "speaker") => {
    if (!streamId) return;
    try {
      await setRole({ data: { streamId, targetUserId: uid, stageRole: role } });
      toast.success(role === "host" ? "Invited as host" : "Invited as guest");
      setInvite(null);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4" style={{ color: PURPLE }} />
          <span className="text-sm font-bold tracking-wider text-white">STAGE ROOM</span>
          <span className="text-[11px] text-white/50">
            · {hosts.length}/{MAX_HOSTS} hosts · {guests.length}/{MAX_GUESTS} guests
          </span>
        </div>
      </div>

      {/* Hosts row */}
      <SectionHeader
        label="HOSTS"
        count={`${hosts.length}/${MAX_HOSTS}`}
        color={PURPLE}
        canInvite={canManage && hosts.length < MAX_HOSTS}
        onInvite={() => setInvite("host")}
        inviteLabel="Invite Host"
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {hosts.map((p) => (
          <SpeakerBubble
            key={p.id}
            p={p}
            kind="host"
            canManage={canManage}
            onDemote={() => demote(p.user_id)}
            onKick={() => kick(p.user_id)}
          />
        ))}
        {Array.from({ length: Math.max(0, MAX_HOSTS - hosts.length) }).map((_, i) => (
          <EmptySlot key={`h-${i}`} label="Host slot" />
        ))}
      </div>

      {/* Guests row */}
      <div className="mt-6">
        <SectionHeader
          label="GUESTS"
          count={`${guests.length}/${MAX_GUESTS}`}
          color="#22c55e"
          canInvite={canManage && guests.length < MAX_GUESTS}
          onInvite={() => setInvite("speaker")}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {guests.map((p) => (
            <SpeakerBubble
              key={p.id}
              p={p}
              kind="speaker"
              canManage={canManage}
              onDemote={() => demote(p.user_id)}
              onKick={() => kick(p.user_id)}
            />
          ))}
          {Array.from({ length: Math.max(0, MAX_GUESTS - guests.length) }).map((_, i) => (
            <EmptySlot key={`g-${i}`} label="Guest slot" />
          ))}
        </div>
      </div>

      {/* Audience */}
      {audience.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[11px] font-bold tracking-widest text-white/60">AUDIENCE</div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {audience.slice(0, 12).map((p) => (
              <ListenerBubble
                key={p.id}
                p={p}
                canManage={canManage}
                onPromote={() => promote(p.user_id, "speaker")}
              />
            ))}
          </div>
        </div>
      )}

      {invite && (
        <InviteModal
          kind={invite}
          audience={audience}
          onClose={() => setInvite(null)}
          onPick={(uid) => promote(uid, invite)}
        />
      )}
    </div>
  );
}

function SectionHeader({
  label, count, color, canInvite, onInvite,
}: { label: string; count: string; color: string; canInvite: boolean; onInvite: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-bold tracking-widest text-white/80">{label}</span>
        <span className="text-[10px] text-white/40">{count}</span>
      </div>
      {canInvite && (
        <button
          onClick={onInvite}
          className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/5"
        >
          <UserPlus className="h-3 w-3" /> Invite
        </button>
      )}
    </div>
  );
}

function InviteModal({
  kind, audience, onClose, onPick,
}: {
  kind: "host" | "speaker";
  audience: StageParticipant[];
  onClose: () => void;
  onPick: (uid: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d18] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-bold text-white">
            Invite as {kind === "host" ? "Host" : "Guest"}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {audience.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-white/50">
            No one in the audience yet. Share your stream link to bring people in.
          </div>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {audience.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onPick(p.user_id)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
                  )}
                  <span className="flex-1 text-sm text-white">{p.display_name ?? "Listener"}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    Invite
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
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

function EmptySlot({ label = "Open slot" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 opacity-40">
      <div className="h-20 w-20 rounded-full border-2 border-dashed border-white/20" />
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}