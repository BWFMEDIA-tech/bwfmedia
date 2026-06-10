import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  setStageRole,
  removeStageParticipant,
  promoteToHost,
  revokeHostPrivileges,
} from "@/lib/stage.functions";
import { toast } from "sonner";
import { Mic, UserPlus, Crown, X, MoreVertical, Shield, Star, ArrowRightLeft, UserMinus, UserCheck } from "lucide-react";
import type { StageParticipant } from "@/lib/useStageState";
import { cn } from "@/lib/utils";
import { useConnectedIdentities, useSpeakingIdentities } from "@/lib/stage-connection-context";

const MAX_HOSTS = 5;
const MAX_GUESTS = 5;

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

export function StageRoom({
  streamId,
  participants,
  canManage,
  selfProfile,
  primaryHostId,
  hostTransferMode = "co_host",
}: {
  streamId: string | null;
  participants: StageParticipant[];
  canManage: boolean;
  selfProfile?: { user_id: string; display_name?: string | null; avatar_url?: string | null } | null;
  primaryHostId?: string | null;
  hostTransferMode?: "co_host" | "transfer";
}) {
  const setRole = useServerFn(setStageRole);
  const remove = useServerFn(removeStageParticipant);
  const promote = useServerFn(promoteToHost);
  const revoke = useServerFn(revokeHostPrivileges);
  const [invite, setInvite] = useState<null | "host" | "speaker">(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    run: () => Promise<void>;
  }>(null);

  const hosts = participants
    .filter((p) => p.stage_role === "host" || p.stage_role === "co_host")
    .slice(0, MAX_HOSTS);
  const guests = participants.filter((p) => p.stage_role === "speaker").slice(0, MAX_GUESTS);
  // If the local host hasn't been registered in stage_participants yet,
  // show their profile in the first host slot as a placeholder.
  const showSelfHostPlaceholder =
    !!selfProfile &&
    canManage &&
    !hosts.some((p) => p.user_id === selfProfile.user_id);
  const hostSlotsTaken = hosts.length + (showSelfHostPlaceholder ? 1 : 0);
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
  const inviteAs = async (uid: string, role: "host" | "speaker") => {
    if (!streamId) return;
    try {
      await setRole({ data: { streamId, targetUserId: uid, stageRole: role } });
      toast.success(role === "host" ? "Invited as host" : "Invited as guest");
      setInvite(null);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const doPromote = (uid: string, name: string, mode: "host" | "co_host" | "transfer") => {
    if (!streamId) return;
    const titles = {
      host: "Promote to Host",
      co_host: "Promote to Co-Host",
      transfer: "Transfer Ownership",
    } as const;
    const descs = {
      host: `${name} will become a Host with full stage management privileges.`,
      co_host: `${name} will become a Co-Host. You'll keep your host role.`,
      transfer: `${name} will become the primary Host. You'll be demoted to Co-Host. This can be reversed only by the new host.`,
    } as const;
    setConfirm({
      title: titles[mode],
      description: descs[mode],
      confirmLabel: titles[mode],
      run: async () => {
        await promote({ data: { streamId, targetUserId: uid, mode } });
        toast.success(titles[mode] + " · done");
      },
    });
  };

  const doRevoke = (uid: string, name: string) => {
    if (!streamId) return;
    setConfirm({
      title: "Remove Host Privileges",
      description: `${name} will return to Guest. They can still speak on stage.`,
      confirmLabel: "Remove Privileges",
      run: async () => {
        await revoke({ data: { streamId, targetUserId: uid } });
        toast.success("Host privileges removed");
      },
    });
  };

  const doKick = (uid: string, name: string) => {
    if (!streamId) return;
    setConfirm({
      title: "Remove From Stage",
      description: `${name} will be removed from the stage entirely.`,
      confirmLabel: "Remove",
      run: async () => {
        await remove({ data: { streamId, targetUserId: uid } });
        toast.success("Removed");
      },
    });
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
            kind={p.stage_role === "co_host" ? "co_host" : "host"}
            canManage={canManage}
            isPrimaryHost={!!primaryHostId && p.user_id === primaryHostId}
            hostTransferMode={hostTransferMode}
            onPromote={(mode) => doPromote(p.user_id, p.display_name ?? "This user", mode)}
            onRevoke={() => doRevoke(p.user_id, p.display_name ?? "This user")}
            onKick={() => doKick(p.user_id, p.display_name ?? "This user")}
          />
        ))}
        {showSelfHostPlaceholder && (
          <SpeakerBubble
            key="self-host-placeholder"
            p={{
              id: "self-host-placeholder",
              stream_id: streamId ?? "",
              user_id: selfProfile!.user_id,
              stage_role: "host",
              joined_at: new Date().toISOString(),
              display_name: selfProfile!.display_name ?? null,
              avatar_url: selfProfile!.avatar_url ?? null,
            }}
            kind="host"
            canManage={false}
          />
        )}
        {Array.from({ length: Math.max(0, MAX_HOSTS - hostSlotsTaken) }).map((_, i) => (
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
          inviteLabel="Invite Guest"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {guests.map((p) => (
            <SpeakerBubble
              key={p.id}
              p={p}
              kind="speaker"
              canManage={canManage}
              isPrimaryHost={false}
              hostTransferMode={hostTransferMode}
              onPromote={(mode) => doPromote(p.user_id, p.display_name ?? "Guest", mode)}
              onDemote={() => demote(p.user_id)}
              onKick={() => doKick(p.user_id, p.display_name ?? "Guest")}
            />
          ))}
          {Array.from({ length: Math.max(0, MAX_GUESTS - guests.length) }).map((_, i) => (
            <EmptySlot key={`g-${i}`} label="Guest slot" />
          ))}
        </div>
      </div>

      {invite && (
        <InviteModal
          kind={invite}
          audience={audience}
          onClose={() => setInvite(null)}
          onPick={(uid) => inviteAs(uid, invite)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          {...confirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({
  label, count, color, canInvite, onInvite, inviteLabel,
}: { label: string; count: string; color: string; canInvite: boolean; onInvite: () => void; inviteLabel?: string }) {
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
          <UserPlus className="h-3 w-3" /> {inviteLabel ?? "Invite"}
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
                  <Link to="/user/$id" params={{ id: p.user_id }} onClick={(e) => e.stopPropagation()} className="shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
                    )}
                  </Link>
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
  const connected = useConnectedIdentities();
  const isConnected = connected.has(p.user_id);
  const speaking = useSpeakingIdentities();
  const isSpeaking = speaking.has(p.user_id);
  const isPlaceholder = p.id === "self-host-placeholder";
  const dbStatus = p.connection_status ?? "connected";
  const isReconnecting = !isPlaceholder && (dbStatus === "reconnecting" || (dbStatus === "connected" && !isConnected));
  const isDisconnected = dbStatus === "disconnected";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="absolute -mt-3 self-center">
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest text-white"
          style={{ background: kind === "host" ? PURPLE : "#16a34a" }}
        >
          {kind === "host" ? "HOST" : "GUEST"}
        </span>
      </div>
      <div
        className={cn(
          "relative rounded-full p-1 transition-transform duration-150",
          isSpeaking && "scale-110 animate-pulse",
        )}
        style={{
          boxShadow: isSpeaking
            ? `0 0 40px ${ringColor}, 0 0 80px ${ringColor}aa`
            : `0 0 24px ${ringColor}66`,
          background: `conic-gradient(${ringColor}, transparent 70%, ${ringColor})`,
        }}
      >
        <Link to="/user/$id" params={{ id: p.user_id }}>
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-full border-2 border-[#0d0d18] object-cover" />
          ) : (
            <div className="h-20 w-20 rounded-full border-2 border-[#0d0d18]" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
          )}
        </Link>
        <div
          className={cn(
            "absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0d0d18] transition-transform",
            isSpeaking && "scale-125 animate-bounce",
          )}
          style={{ background: ringColor }}
        >
          <Mic className="h-3 w-3 text-white" />
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 text-xs font-bold text-white">
          {kind === "host" && <Crown className="h-3 w-3" style={{ color: PURPLE }} />}
          {p.display_name ?? "Guest"}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConnected && !isReconnecting
                ? "bg-emerald-400"
                : isDisconnected
                  ? "bg-red-400"
                  : "bg-amber-400 animate-pulse",
            )}
          />
          <span className="text-[10px] text-white/60">
            {isPlaceholder && !isConnected
              ? "Not joined"
              : isConnected && !isReconnecting
                ? "Connected"
                : isDisconnected
                  ? "Disconnected"
                  : "Reconnecting…"}
          </span>
        </div>
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

function ListenerBubble({ p }: { p: StageParticipant }) {
  return (
    <Link
      to="/user/$id"
      params={{ id: p.user_id }}
      className="group flex flex-col items-center gap-1"
      title={`View ${p.display_name ?? "listener"}'s page`}
    >
      <div className="rounded-full p-0.5 transition group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${BLUE}88, transparent)` }}>
        {p.avatar_url ? (
          <img src={p.avatar_url} alt={p.display_name ?? "Listener"} className="h-12 w-12 rounded-full border border-[#0d0d18] object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-full border border-[#0d0d18]" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
        )}
      </div>
      <div className="text-[10px] font-medium text-white truncate max-w-[80px]">{p.display_name ?? "Listener"}</div>
      <div className="text-[9px] text-white/40">Listener</div>
    </Link>
  );
}

export function AudienceRow({ participants }: { participants: StageParticipant[] }) {
  const audience = participants.filter(
    (p) => p.stage_role === "listener" || p.stage_role === "green_room",
  );
  if (audience.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-5">
      <div className="mb-3 text-[11px] font-bold tracking-widest text-white/60">
        AUDIENCE · {audience.length}
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
        {audience.map((p) => (
          <ListenerBubble key={p.id} p={p} />
        ))}
      </div>
    </div>
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