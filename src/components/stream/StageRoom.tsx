import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  setStageRole,
  removeStageParticipant,
  promoteToHost,
  revokeHostPrivileges,
  demoteToAudience,
  setParticipantMute,
} from "@/lib/stage.functions";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  UserPlus,
  Crown,
  X,
  MoreVertical,
  Shield,
  Star,
  ArrowRightLeft,
  UserMinus,
  UserCheck,
  UserX,
} from "lucide-react";
import type { StageParticipant } from "@/lib/useStageState";
import { cn } from "@/lib/utils";
import { useConnectedIdentities, useSpeakingIdentities } from "@/lib/stage-connection-context";

const MAX_HOSTS = 5;
const MAX_GUESTS = 20;

// BWF cinema palette — "Immersive Stage Cinema"
const PURPLE = "#C53DFF"; // brand magenta (primary, host)
const BLUE = "#004BFF"; // brand electric blue (co-host accents)
const ACCENT = "#00E6FF"; // brand cyan (guest accent)
const PINK = "#FF00A6"; // brand pink (live / speaking secondary)

// Cap how many empty guest tiles we render — 20 dashed circles is visual noise.
const VISIBLE_EMPTY_GUESTS = 5;

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
  const demoteSrv = useServerFn(demoteToAudience);
  const muteFn = useServerFn(setParticipantMute);
  const [invite, setInvite] = useState<null | "host" | "speaker">(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    run: () => Promise<void>;
  }>(null);

  const hosts = participants.filter((p) => p.stage_role === "host" || p.stage_role === "co_host").slice(0, MAX_HOSTS);
  const guests = participants.filter((p) => p.stage_role === "speaker").slice(0, MAX_GUESTS);
  // If the local host hasn't been registered in stage_participants yet,
  // show their profile in the first host slot as a placeholder.
  const showSelfHostPlaceholder = !!selfProfile && canManage && !hosts.some((p) => p.user_id === selfProfile.user_id);
  const hostSlotsTaken = hosts.length + (showSelfHostPlaceholder ? 1 : 0);
  const audience = participants.filter((p) => p.stage_role === "listener" || p.stage_role === "green_room");

  const demote = async (uid: string) => {
    if (!streamId) return;
    try {
      await setRole({ data: { streamId, targetUserId: uid, stageRole: "listener" } });
      toast.success("Demoted to listener");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };
  const kick = async (uid: string) => {
    if (!streamId) return;
    try {
      await remove({ data: { streamId, targetUserId: uid } });
      toast.success("Removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };
  const inviteAs = async (uid: string, role: "host" | "speaker") => {
    if (!streamId) return;
    try {
      await setRole({ data: { streamId, targetUserId: uid, stageRole: role } });
      toast.success(role === "host" ? "Invited as host" : "Invited as guest");
      setInvite(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
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

  const doDemoteToAudience = (uid: string, name: string) => {
    if (!streamId) return;
    setConfirm({
      title: "Demote to Audience",
      description: `${name} will return to the audience. They'll lose mic and camera publishing rights immediately but stay in the stream as a viewer.`,
      confirmLabel: "Demote to Audience",
      run: async () => {
        await demoteSrv({ data: { streamId, targetUserId: uid } });
        toast.success("Moved to audience");
      },
    });
  };

  const doToggleMute = async (p: StageParticipant) => {
    if (!streamId) return;
    const isMuted = !!p.muted_until && new Date(p.muted_until).getTime() > Date.now();
    try {
      await muteFn({
        data: {
          streamId,
          targetUserId: p.user_id,
          mute: !isMuted,
          durationMinutes: 60,
        },
      });
      toast.success(isMuted ? "Mic unmuted" : "Mic muted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-6 shadow-[0_0_80px_-20px_rgba(197,61,255,0.55)] [font-family:'Space_Grotesk',ui-sans-serif,system-ui]"
      style={{
        background:
          "radial-gradient(60% 60% at 12% 0%, rgba(197,61,255,0.28), transparent 70%), radial-gradient(50% 60% at 100% 100%, rgba(0,75,255,0.30), transparent 70%), radial-gradient(40% 50% at 85% 10%, rgba(0,230,255,0.18), transparent 70%), #05050b",
      }}
    >
      {/* subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px, 44px 44px",
        }}
      />
      <div className="relative mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
              boxShadow: `0 0 24px ${PURPLE}80, inset 0 0 12px rgba(255,255,255,0.18)`,
            }}
          >
            <Mic className="h-4 w-4 text-white" />
            <span
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full"
              style={{ background: PINK, boxShadow: `0 0 12px ${PINK}, 0 0 24px ${PINK}` }}
            />
            <span
              className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full opacity-75"
              style={{ background: PINK }}
            />
          </div>
          <div className="min-w-0">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.32em]"
              style={{ color: PINK, textShadow: `0 0 14px ${PINK}80` }}
            >
              ● ON STAGE
            </div>
            <div
              className="truncate text-xl font-black uppercase leading-none tracking-[0.18em] text-white sm:text-2xl"
              style={{ textShadow: `0 0 24px ${PURPLE}aa` }}
            >
              Stage Room
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <CapacityChip label="Hosts" filled={hostSlotsTaken} total={MAX_HOSTS} color={PURPLE} />
          <CapacityChip label="Guests" filled={guests.length} total={MAX_GUESTS} color={ACCENT} />
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-5">
        {hosts.map((p) => (
          <SpeakerBubble
            key={p.id}
            p={p}
            kind={p.stage_role === "co_host" ? "co_host" : "host"}
            canManage={canManage}
            isPrimaryHost={!!primaryHostId && p.user_id === primaryHostId}
            isSelf={!!selfProfile && selfProfile.user_id === p.user_id}
            hostTransferMode={hostTransferMode}
            onPromote={(mode) => doPromote(p.user_id, p.display_name ?? "This user", mode)}
            onRevoke={() => doRevoke(p.user_id, p.display_name ?? "This user")}
            onKick={() => doKick(p.user_id, p.display_name ?? "This user")}
            onDemoteToAudience={() => doDemoteToAudience(p.user_id, p.display_name ?? "This user")}
            onToggleMute={() => doToggleMute(p)}
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
          <EmptySlot key={`h-${i}`} label="Host slot" color={PURPLE} />
        ))}
      </div>

      {/* Guests row */}
      <div className="mt-8">
        <SectionHeader
          label="GUESTS"
          count={`${guests.length}/${MAX_GUESTS}`}
          color={ACCENT}
          canInvite={canManage && guests.length < MAX_GUESTS}
          onInvite={() => setInvite("speaker")}
          inviteLabel="Invite Guest"
        />
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-5">
          {guests.map((p) => (
            <SpeakerBubble
              key={p.id}
              p={p}
              kind="speaker"
              canManage={canManage}
              isPrimaryHost={false}
              isSelf={!!selfProfile && selfProfile.user_id === p.user_id}
              hostTransferMode={hostTransferMode}
              onPromote={(mode) => doPromote(p.user_id, p.display_name ?? "Guest", mode)}
              onDemote={() => demote(p.user_id)}
              onKick={() => doKick(p.user_id, p.display_name ?? "Guest")}
              onDemoteToAudience={() => doDemoteToAudience(p.user_id, p.display_name ?? "Guest")}
              onToggleMute={() => doToggleMute(p)}
            />
          ))}
          {(() => {
            const remaining = Math.max(0, MAX_GUESTS - guests.length);
            const visible = Math.min(remaining, VISIBLE_EMPTY_GUESTS);
            const overflow = remaining - visible;
            return (
              <>
                {Array.from({ length: visible }).map((_, i) => (
                  <EmptySlot key={`g-${i}`} label="Guest slot" color={ACCENT} />
                ))}
                {overflow > 0 && <MoreOpenChip count={overflow} color={ACCENT} />}
              </>
            );
          })()}
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
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  color,
  canInvite,
  onInvite,
  inviteLabel,
}: {
  label: string;
  count: string;
  color: string;
  canInvite: boolean;
  onInvite: () => void;
  inviteLabel?: string;
}) {
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
  kind,
  audience,
  onClose,
  onPick,
}: {
  kind: "host" | "speaker";
  audience: StageParticipant[];
  onClose: () => void;
  onPick: (uid: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d18] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-bold text-white">Invite as {kind === "host" ? "Host" : "Guest"}</div>
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
                  <Link
                    to="/user/$id"
                    params={{ id: p.user_id }}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-full"
                        style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
                      />
                    )}
                  </Link>
                  <span className="flex-1 text-sm text-white">{p.display_name ?? "Listener"}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Invite</span>
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
  isPrimaryHost = false,
  isSelf = false,
  hostTransferMode = "co_host",
  onPromote,
  onDemote,
  onRevoke,
  onKick,
  onDemoteToAudience,
  onToggleMute,
}: {
  p: StageParticipant;
  kind: "host" | "co_host" | "speaker";
  canManage: boolean;
  isPrimaryHost?: boolean;
  isSelf?: boolean;
  hostTransferMode?: "co_host" | "transfer";
  onPromote?: (mode: "host" | "co_host" | "transfer") => void;
  onDemote?: () => void;
  onRevoke?: () => void;
  onKick?: () => void;
  onDemoteToAudience?: () => void;
  onToggleMute?: () => void;
}) {
  const ringColor = kind === "host" ? PURPLE : kind === "co_host" ? "#dc2626" : ACCENT;
  const connected = useConnectedIdentities();
  // When no LiveKit context is mounted (e.g. audience viewer in broadcast
  // mode), trust the DB connection_status heartbeat instead of forcing
  // every tile into a "Reconnecting…" state.
  const hasLiveKitContext = connected !== null;
  const isConnected = hasLiveKitContext ? connected.has(p.user_id) : true;
  const speaking = useSpeakingIdentities();
  const isSpeaking = speaking.has(p.user_id);
  const isPlaceholder = p.id === "self-host-placeholder";
  const dbStatus = p.connection_status ?? "connected";
  const isReconnecting =
    !isPlaceholder &&
    (dbStatus === "reconnecting" ||
      (hasLiveKitContext && dbStatus === "connected" && !isConnected));
  const isDisconnected = dbStatus === "disconnected";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);
  const badgeLabel = kind === "host" ? "HOST" : kind === "co_host" ? "CO-HOST" : "GUEST";
  const badgeBg = kind === "host" ? PURPLE : kind === "co_host" ? "#991b1b" : "#c2410c";
  const isMuted = !!p.muted_until && new Date(p.muted_until).getTime() > Date.now();
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="absolute -mt-3 self-center">
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest text-white"
          style={{ background: badgeBg }}
        >
          {badgeLabel}
        </span>
      </div>
      <div
        className={cn(
          "relative rounded-full p-1 transition-transform duration-150",
          isSpeaking && "scale-110 animate-pulse",
        )}
        style={{
          boxShadow: isSpeaking ? `0 0 40px ${ringColor}, 0 0 80px ${ringColor}aa` : `0 0 24px ${ringColor}66`,
          background: `conic-gradient(${ringColor}, transparent 70%, ${ringColor})`,
        }}
      >
        <Link to="/artist/$id" params={{ id: p.user_id }}>
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-full border-2 border-[#0d0d18] object-cover" />
          ) : (
            <div
              className="h-20 w-20 rounded-full border-2 border-[#0d0d18]"
              style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
            />
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
          {kind === "co_host" && <Star className="h-3 w-3" style={{ color: "#60a5fa" }} />}
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
      {canManage && !isPlaceholder && (
        <div className="flex items-center gap-1.5">
          {/* Quick host actions — always visible on the tile so the host
              doesn't need to open the Manage menu for the most common ops. */}
          {!isSelf && onToggleMute && (
            <button
              type="button"
              title={isMuted ? "Unmute mic" : "Mute mic"}
              onClick={onToggleMute}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-white/90 transition",
                isMuted
                  ? "border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/25"
                  : "border-white/15 hover:bg-white/10",
              )}
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
          {!isSelf && !isPrimaryHost && onKick && (
            <button
              type="button"
              title="Remove from stage"
              onClick={onKick}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500/40 text-red-300 transition hover:bg-red-500/15"
            >
              <UserMinus className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/80 hover:bg-white/5"
          >
            <MoreVertical className="h-3 w-3" /> Manage
          </button>
          {menuOpen && (
            <div className="absolute left-1/2 z-30 mt-1 w-56 -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 bg-[#13131f] shadow-xl">
              {kind === "speaker" && onPromote && (
                <>
                  <MenuItem
                    icon={<Crown className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setMenuOpen(false);
                      onPromote("host");
                    }}
                  >
                    Promote to Host
                  </MenuItem>
                  <MenuItem
                    icon={<Star className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setMenuOpen(false);
                      onPromote("co_host");
                    }}
                  >
                    Promote to Co-Host
                  </MenuItem>
                  {hostTransferMode === "transfer" && (
                    <MenuItem
                      icon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onPromote("transfer");
                      }}
                    >
                      Transfer Ownership
                    </MenuItem>
                  )}
                  <MenuDivider />
                  {onToggleMute && !isSelf && (
                    <MenuItem
                      icon={isMuted ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleMute();
                      }}
                    >
                      {isMuted ? "Unmute mic" : "Mute mic"}
                    </MenuItem>
                  )}
                  {onDemoteToAudience && !isSelf && (
                    <MenuItem
                      icon={<UserX className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onDemoteToAudience();
                      }}
                    >
                      Demote to Audience
                    </MenuItem>
                  )}
                  <MenuItem
                    icon={<UserMinus className="h-3.5 w-3.5" />}
                    danger
                    onClick={() => {
                      setMenuOpen(false);
                      onKick?.();
                    }}
                  >
                    Remove From Stage
                  </MenuItem>
                </>
              )}
              {(kind === "host" || kind === "co_host") && (
                <>
                  {kind === "co_host" && onPromote && (
                    <MenuItem
                      icon={<Crown className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onPromote("host");
                      }}
                    >
                      Promote to Host
                    </MenuItem>
                  )}
                  {!isPrimaryHost && hostTransferMode === "transfer" && onPromote && (
                    <MenuItem
                      icon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onPromote("transfer");
                      }}
                    >
                      Transfer Ownership
                    </MenuItem>
                  )}
                  {!isPrimaryHost && onRevoke && (
                    <MenuItem
                      icon={<Shield className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onRevoke();
                      }}
                    >
                      Remove Host Privileges
                    </MenuItem>
                  )}
                  {!isPrimaryHost && onToggleMute && !isSelf && (
                    <MenuItem
                      icon={isMuted ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleMute();
                      }}
                    >
                      {isMuted ? "Unmute mic" : "Mute mic"}
                    </MenuItem>
                  )}
                  {!isPrimaryHost && (
                    <>
                      <MenuDivider />
                      {onDemoteToAudience && !isSelf && (
                        <MenuItem
                          icon={<UserX className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setMenuOpen(false);
                            onDemoteToAudience();
                          }}
                        >
                          Demote to Audience
                        </MenuItem>
                      )}
                      <MenuItem
                        icon={<UserMinus className="h-3.5 w-3.5" />}
                        danger
                        onClick={() => {
                          setMenuOpen(false);
                          onKick?.();
                        }}
                      >
                        Remove From Stage
                      </MenuItem>
                    </>
                  )}
                  {isPrimaryHost && (
                    <div className="px-3 py-2 text-[10px] text-white/40">
                      <UserCheck className="mr-1 inline h-3 w-3" />
                      Primary host
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          </div>
        </div>
      )}
      {!canManage && false && onDemote && <button onClick={onDemote} />}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5",
        danger ? "text-red-300" : "text-white/80",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
function MenuDivider() {
  return <div className="my-1 h-px bg-white/5" />;
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  run,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-sm font-bold text-white">{title}</div>
        <p className="mb-4 text-xs text-white/70">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await run();
                onClose();
              } catch (e: any) {
                toast.error(e?.message ?? "Failed");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
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
      <div
        className="rounded-full p-0.5 transition group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${BLUE}88, transparent)` }}
      >
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={p.display_name ?? "Listener"}
            className="h-12 w-12 rounded-full border border-[#0d0d18] object-cover"
          />
        ) : (
          <div
            className="h-12 w-12 rounded-full border border-[#0d0d18]"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
          />
        )}
      </div>
      <div className="text-[10px] font-medium text-white truncate max-w-[80px]">{p.display_name ?? "Listener"}</div>
      <div className="text-[9px] text-white/40">Listener</div>
    </Link>
  );
}

export function AudienceRow({ participants }: { participants: StageParticipant[] }) {
  const audience = participants.filter((p) => p.stage_role === "listener" || p.stage_role === "green_room");
  if (audience.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-5">
      <div className="mb-3 text-[11px] font-bold tracking-widest text-white/60">AUDIENCE · {audience.length}</div>
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
