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
  setStageMuteAll,
  setStreamSpotlight,
} from "@/lib/stage.functions";
import { listModerators } from "@/lib/moderation.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  Pin,
  PinOff,
  ChevronDown,
  Users,
} from "lucide-react";
import type { StageParticipant } from "@/lib/useStageState";
import { cn } from "@/lib/utils";
import { useConnectedIdentities, useSpeakingIdentities } from "@/lib/stage-connection-context";
import { SignedImg } from "@/components/ui/signed-img";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const MAX_HOSTS = 5;
const MAX_GUESTS = 20;
const MAX_MODS = 5;

// BWF cinema palette — "Immersive Stage Cinema"
const PURPLE = "#0000FF"; // brand magenta (primary, host)
const BLUE = "#0000FF"; // brand electric blue (co-host accents)
const ACCENT = "#00E6FF"; // brand cyan (guest accent)
const PINK = "#00E6FF"; // brand pink (live / speaking secondary)

// Cap how many empty guest tiles we render — 20 dashed circles is visual noise.
const VISIBLE_EMPTY_GUESTS = 5;

export function StageRoom({
  streamId,
  participants,
  canManage,
  selfProfile,
  primaryHostId,
  hostTransferMode = "co_host",
  spotlight,
}: {
  streamId: string | null;
  participants: StageParticipant[];
  canManage: boolean;
  selfProfile?: { user_id: string; display_name?: string | null; avatar_url?: string | null } | null;
  primaryHostId?: string | null;
  hostTransferMode?: "co_host" | "transfer";
  spotlight?: { host: string | null; artist: string | null; cohost?: string | null };
}) {
  const hostsRef = useRef<HTMLDivElement>(null);
  const modsRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef<HTMLDivElement>(null);
  const goToSection = (section: "hosts" | "mods" | "guests") => {
    const target = section === "hosts" ? hostsRef : section === "mods" ? modsRef : guestsRef;
    requestAnimationFrame(() => target.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const setRole = useServerFn(setStageRole);
  const remove = useServerFn(removeStageParticipant);
  const promote = useServerFn(promoteToHost);
  const revoke = useServerFn(revokeHostPrivileges);
  const demoteSrv = useServerFn(demoteToAudience);
  const muteFn = useServerFn(setParticipantMute);
  const muteAllFn = useServerFn(setStageMuteAll);
  const [moderators, setModerators] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null }[]>([]);
  const [muteAllBusy, setMuteAllBusy] = useState(false);
  const stageSpeakers = participants.filter((x) => x.stage_role === "host" || x.stage_role === "co_host" || x.stage_role === "speaker");
  const stageAllMuted = stageSpeakers.length > 0 && stageSpeakers.every((x) => !!x.muted_until && new Date(x.muted_until).getTime() > Date.now());
  const isMutedP = (x: StageParticipant) => !!x.muted_until && new Date(x.muted_until).getTime() > Date.now();
  const guestSpeakers = participants.filter((x) => x.stage_role === "speaker");
  const guestsAllMuted = guestSpeakers.length > 0 && guestSpeakers.every(isMutedP);
  // Moderators the host picked for this stream only.
  const [streamModIds, setStreamModIds] = useState<string[]>([]);
  const modIds = new Set([...moderators.map((m) => m.user_id), ...streamModIds]);
  const modSpeakers = stageSpeakers.filter((x) => modIds.has(x.user_id));
  const modsAllMuted = modSpeakers.length > 0 && modSpeakers.every(isMutedP);
  const [groupBusy, setGroupBusy] = useState<null | "guests" | "moderators">(null);
  const toggleGroupMute = async (group: "guests" | "moderators", currentlyMuted: boolean) => {
    if (!streamId) return;
    setGroupBusy(group);
    try {
      await muteAllFn({ data: { streamId, mute: !currentlyMuted, group, userIds: group === "moderators" ? modSpeakers.map((x) => x.user_id) : undefined } });
      toast.success(`${group === "guests" ? "Guests" : "Moderators"} ${currentlyMuted ? "unmuted" : "muted"}`);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setGroupBusy(null); }
  };
  const toggleStageMute = async () => {
    if (!streamId) return;
    setMuteAllBusy(true);
    try {
      await muteAllFn({ data: { streamId, mute: !stageAllMuted } });
      toast.success(stageAllMuted ? "Stage unmuted" : "Whole stage muted — only the music is heard");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setMuteAllBusy(false); }
  };
  const setSpotlight = useServerFn(setStreamSpotlight);
  const [invite, setInvite] = useState<null | "host" | "speaker">(null);
  useEffect(() => {
    let cancelled = false;
    listModerators()
      .then((res) => { if (!cancelled) setModerators(res.moderators); })
      .catch(() => { if (!cancelled) setModerators([]); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!streamId) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("stream_moderators").select("user_id").eq("stream_id", streamId);
      if (active) setStreamModIds((data ?? []).map((r: any) => r.user_id));
    };
    load();
    const ch = supabase
      .channel(`stream-mods-${streamId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stream_moderators", filter: `stream_id=eq.${streamId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [streamId]);
  const toggleStreamMod = async (uid: string, name: string) => {
    if (!streamId) return;
    const isMod = streamModIds.includes(uid);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;
    const res = isMod
      ? await supabase.from("stream_moderators").delete().eq("stream_id", streamId).eq("user_id", uid)
      : await supabase.from("stream_moderators").insert({ stream_id: streamId, user_id: uid, added_by: auth.user.id });
    if (res.error) return toast.error(res.error.message);
    setStreamModIds((prev) => (isMod ? prev.filter((x) => x !== uid) : [...prev, uid]));
    // Mods keep a live mic: bring audience members up to the stage as speakers.
    const target = participants.find((x) => x.user_id === uid);
    if (!isMod && (!target || AUDIENCE_ROLES.includes(target.stage_role ?? "listener"))) {
      try { await setRole({ data: { streamId, targetUserId: uid, stageRole: "speaker" } }); } catch {}
    }
    toast.success(isMod ? `${name} is no longer a moderator` : `${name} is now a moderator and can speak`);
  };
  const allModerators = [
    ...moderators,
    ...streamModIds
      .filter((id) => !moderators.some((m) => m.user_id === id))
      .map((id) => {
        const p = participants.find((x) => x.user_id === id);
        return { user_id: id, display_name: p?.display_name ?? null, avatar_url: p?.avatar_url ?? null };
      }),
  ];
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    run: () => Promise<void>;
  }>(null);

const AUDIENCE_ROLES = ["listener", "green_room"];
  // The primary host is always pinned to the first (left) slot; any other
  // hosts or co-hosts are added to the right in the order they joined.
  const hosts = participants
    .filter((p) => p.stage_role === "host" || p.stage_role === "co_host")
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ap = primaryHostId && a.p.user_id === primaryHostId ? 0 : 1;
      const bp = primaryHostId && b.p.user_id === primaryHostId ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const at = (a.p as any).joined_at ?? (a.p as any).created_at ?? "";
      const bt = (b.p as any).joined_at ?? (b.p as any).created_at ?? "";
      return at && bt ? String(at).localeCompare(String(bt)) : a.i - b.i;
    })
    .map(({ p }) => p)
    .slice(0, MAX_HOSTS);
  // Anyone who is on stage but isn't a host belongs in the guest section —
  // speaker, guest, artist, or any future on-stage role.
  const guests = participants
    .filter(
      (p) =>
        p.stage_role !== "host" &&
        p.stage_role !== "co_host" &&
        !streamModIds.includes(p.user_id) &&
        !AUDIENCE_ROLES.includes(p.stage_role ?? "listener"),
    )
    .slice(0, MAX_GUESTS);
  const selfListed =
    !!selfProfile &&
    (hosts.some((p) => p.user_id === selfProfile.user_id) || guests.some((p) => p.user_id === selfProfile.user_id));
  // If the local user hasn't been registered in stage_participants yet, show a
  // placeholder — in the host row only when they can manage the stage,
  // otherwise in the guest row.
  const showSelfHostPlaceholder = !!selfProfile && canManage && !selfListed;
  const showSelfGuestPlaceholder = !!selfProfile && !canManage && !selfListed;
  const hostSlotsTaken = hosts.length + (showSelfHostPlaceholder ? 1 : 0);
  const guestSlotsTaken = guests.length + (showSelfGuestPlaceholder ? 1 : 0);
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
      host: "Bring to host slot",
      co_host: "Promote to Co-Host",
      transfer: "Transfer Ownership",
    } as const;
    const descs = {
      host: `${name} will move into an open Host slot in the HOSTS row with full stage management privileges.`,
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
      title: "Demote to Guest",
      description: `${name} will return to Guest. They can still speak on stage.`,
      confirmLabel: "Demote to Guest",
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

  const doSpotlight = async (
    uid: string,
    name: string,
    slot: "host" | "artist" | "cohost",
    currentlyPinned: boolean,
  ) => {
    if (!streamId) return;
    try {
      await setSpotlight({
        data: {
          streamId,
          targetUserId: currentlyPinned ? null : uid,
          slot,
        },
      });
      const label = slot === "host" ? "host box" : slot === "cohost" ? "co-host box" : "artist video box";
      toast.success(
        currentlyPinned
          ? `${name ?? "Guest"} removed from ${label}`
          : `${name ?? "Guest"} moved to ${label}`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div
      className="relative rounded-3xl border border-white/10 p-3 sm:p-6 shadow-[0_0_80px_-20px_rgba(0,0,255,0.55)] [font-family:'Space_Grotesk',ui-sans-serif,system-ui]"
      style={{
        background:
          "radial-gradient(60% 60% at 12% 0%, rgba(0,0,255,0.28), transparent 70%), radial-gradient(50% 60% at 100% 100%, rgba(0,0,255,0.30), transparent 70%), radial-gradient(40% 50% at 85% 10%, rgba(0,230,255,0.18), transparent 70%), #05050b",
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto shrink-0 gap-2 border-primary/40 bg-card text-foreground" aria-label="Stage menu">
              <Users className="h-4 w-4 text-primary" /><span className="hidden sm:inline">Stage</span><ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-24px)] border-primary/30">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Stage sections</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => goToSection("hosts")}><Crown className="text-primary" />Hosts<span className="ml-auto tabular-nums text-muted-foreground">{hostSlotsTaken}/{MAX_HOSTS}</span></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => goToSection("mods")}><Shield className="text-brand-silver" />Mods<span className="ml-auto tabular-nums text-muted-foreground">{Math.min(allModerators.length, MAX_MODS)}/{MAX_MODS}</span></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => goToSection("guests")}><Users className="text-primary" />Guests<span className="ml-auto tabular-nums text-muted-foreground">{guestSlotsTaken}/{MAX_GUESTS}</span></DropdownMenuItem>
            {canManage && <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Stage controls</DropdownMenuLabel>
              <DropdownMenuItem disabled={muteAllBusy || !streamId || stageSpeakers.length === 0} onSelect={() => { void toggleStageMute(); }}>
                {stageAllMuted ? <MicOff /> : <Mic />}{muteAllBusy ? "Updating stage…" : stageAllMuted ? "Unmute stage" : "Mute whole stage"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={groupBusy !== null || !streamId || modSpeakers.length === 0} onSelect={() => { void toggleGroupMute("moderators", modsAllMuted); }}>
                {modsAllMuted ? <MicOff /> : <Mic />}{groupBusy === "moderators" ? "Updating mods…" : modsAllMuted ? "Unmute all mods" : "Mute all mods"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={groupBusy !== null || !streamId || guestSpeakers.length === 0} onSelect={() => { void toggleGroupMute("guests", guestsAllMuted); }}>
                {guestsAllMuted ? <MicOff /> : <Mic />}{groupBusy === "guests" ? "Updating guests…" : guestsAllMuted ? "Unmute all guests" : "Mute all guests"}
              </DropdownMenuItem>
            </>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hosts row */}
      <div ref={hostsRef} className="scroll-mt-20">
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
            spotlightHostId={spotlight?.host ?? null}
            spotlightArtistId={spotlight?.artist ?? null}
            spotlightCohostId={spotlight?.cohost ?? null}
            onPromote={(mode) => doPromote(p.user_id, p.display_name ?? "This user", mode)}
            onRevoke={() => doRevoke(p.user_id, p.display_name ?? "This user")}
            onKick={() => doKick(p.user_id, p.display_name ?? "This user")}
            onDemoteToAudience={() => doDemoteToAudience(p.user_id, p.display_name ?? "This user")}
            isStreamMod={streamModIds.includes(p.user_id)}
            onToggleModerator={canManage ? () => toggleStreamMod(p.user_id, p.display_name ?? "This user") : undefined}
            onToggleMute={() => doToggleMute(p)}
            onSpotlight={(slot, currentlyPinned) =>
              doSpotlight(p.user_id, p.display_name ?? "Guest", slot, currentlyPinned)
            }
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
          <EmptySlot key={`h-${i}`} label="Host slot" color="#00E6FF" />
        ))}
      </div>

      </div>
      {/* Moderators row */}
      <div ref={modsRef} className="mt-8 scroll-mt-20">
        <SectionHeader
          label="MODERATORS"
          count={`${Math.min(allModerators.length, MAX_MODS)}/${MAX_MODS}`}
          color={BLUE}
          canInvite={false}
          onInvite={() => {}}
          muteAll={canManage ? { muted: modsAllMuted, busy: groupBusy === "moderators", disabled: modSpeakers.length === 0, onToggle: () => toggleGroupMute("moderators", modsAllMuted) } : undefined}
        />
        <p className="-mt-1 mb-3 text-[10px] leading-snug text-white/40">
          Moderators monitor live rooms, remove inappropriate users, handle reports, stop harassment,
          monitor cheating, enforce community rules, and assist hosts. Moderators are assigned by BWF admins.
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-5">
          {allModerators.slice(0, MAX_MODS).map((m) => {
            const p = participants.find(
              (x) => x.user_id === m.user_id && !AUDIENCE_ROLES.includes(x.stage_role ?? "listener") && x.stage_role !== "host" && x.stage_role !== "co_host",
            );
            if (!p) return <ModBubble key={m.user_id} m={m} />;
            return (
              <SpeakerBubble
                key={p.id}
                p={p}
                kind="speaker"
                canManage={canManage}
                isPrimaryHost={false}
                isSelf={!!selfProfile && selfProfile.user_id === p.user_id}
                hostTransferMode={hostTransferMode}
                spotlightHostId={spotlight?.host ?? null}
                spotlightArtistId={spotlight?.artist ?? null}
                spotlightCohostId={spotlight?.cohost ?? null}
                onPromote={(mode) => doPromote(p.user_id, p.display_name ?? "Moderator", mode)}
                onDemote={() => demote(p.user_id)}
                onKick={() => doKick(p.user_id, p.display_name ?? "Moderator")}
                onDemoteToAudience={() => doDemoteToAudience(p.user_id, p.display_name ?? "Moderator")}
                isStreamMod={streamModIds.includes(p.user_id)}
                onToggleModerator={canManage ? () => toggleStreamMod(p.user_id, p.display_name ?? "Moderator") : undefined}
                onToggleMute={() => doToggleMute(p)}
                onSpotlight={(slot, currentlyPinned) => doSpotlight(p.user_id, p.display_name ?? "Moderator", slot, currentlyPinned)}
                hostSlotOpen={hostSlotsTaken < MAX_HOSTS}
              />
            );
          })}
          {Array.from({ length: Math.max(0, MAX_MODS - Math.min(allModerators.length, MAX_MODS)) }).map((_, i) => (
            <EmptySlot key={`m-${i}`} label="Mod slot" color="#C0C8D8" />
          ))}
        </div>
      </div>

      {/* Guests row */}
      <div ref={guestsRef} className="mt-8 scroll-mt-20">
        <SectionHeader
          label="GUESTS"
          count={`${guestSlotsTaken}/${MAX_GUESTS}`}
          color={ACCENT}
          canInvite={canManage && guestSlotsTaken < MAX_GUESTS}

          onInvite={() => setInvite("speaker")}
          inviteLabel="Invite Guest"
          muteAll={canManage ? { muted: guestsAllMuted, busy: groupBusy === "guests", disabled: guestSpeakers.length === 0, onToggle: () => toggleGroupMute("guests", guestsAllMuted) } : undefined}
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
              spotlightHostId={spotlight?.host ?? null}
              spotlightArtistId={spotlight?.artist ?? null}
            spotlightCohostId={spotlight?.cohost ?? null}
              onPromote={(mode) => doPromote(p.user_id, p.display_name ?? "Guest", mode)}
              onDemote={() => demote(p.user_id)}
              onKick={() => doKick(p.user_id, p.display_name ?? "Guest")}
              onDemoteToAudience={() => doDemoteToAudience(p.user_id, p.display_name ?? "Guest")}
              isStreamMod={streamModIds.includes(p.user_id)}
              onToggleModerator={canManage ? () => toggleStreamMod(p.user_id, p.display_name ?? "Guest") : undefined}
              onToggleMute={() => doToggleMute(p)}
              onSpotlight={(slot, currentlyPinned) =>
                doSpotlight(p.user_id, p.display_name ?? "Guest", slot, currentlyPinned)
              }
              hostSlotOpen={hostSlotsTaken < MAX_HOSTS}
            />
          ))}
          {showSelfGuestPlaceholder && (
            <SpeakerBubble
              key="self-guest-placeholder"
              p={{
                id: "self-guest-placeholder",
                stream_id: streamId ?? "",
                user_id: selfProfile!.user_id,
                stage_role: "speaker",
                joined_at: new Date().toISOString(),
                display_name: selfProfile!.display_name ?? null,
                avatar_url: selfProfile!.avatar_url ?? null,
              }}
              kind="speaker"
              canManage={false}
              isSelf
            />
          )}
          {(() => {
            const remaining = Math.max(0, MAX_GUESTS - guestSlotsTaken);
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

function ModBubble({
  m,
}: {
  m: { user_id: string; display_name: string | null; avatar_url: string | null };
}) {
  return (
    <div className="group relative flex flex-col items-center gap-2 pt-3">
      <div className="relative">
        <div
          className="absolute -inset-1 rounded-full opacity-70 blur-md"
          style={{ background: `radial-gradient(circle, ${BLUE}66, transparent 70%)` }}
        />
        <div
          className="relative shrink-0 rounded-full p-[2px]"
          style={{ background: `linear-gradient(135deg, ${BLUE}, ${ACCENT})` }}
        >
          {m.avatar_url ? (
            <SignedImg
              src={m.avatar_url}
              alt={m.display_name ?? "Moderator"}
              className="h-[88px] w-[88px] shrink-0 rounded-full border border-[#0d0d18] object-cover"
            />
          ) : (
            <div
              className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full border border-[#0d0d18] text-2xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})` }}
            >
              {(m.display_name ?? "M").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span
          className="absolute -top-0.5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest text-white shadow-lg shadow-black/50 ring-1 ring-black/40"
          style={{ background: `linear-gradient(135deg, ${BLUE}, ${ACCENT})` }}
        >
          MOD
        </span>
        <span
          className="absolute -bottom-1 -right-1 z-30 grid h-5 w-5 place-items-center rounded-full ring-2 ring-[#05050b]"
          style={{ background: BLUE }}
        >
          <Shield className="h-3 w-3 text-white" />
        </span>
      </div>
      <span className="max-w-full truncate text-xs font-semibold text-white/90">
        {m.display_name ?? "Moderator"}
      </span>
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
  muteAll,
}: {
  label: string;
  count: string;
  color: string;
  canInvite: boolean;
  onInvite: () => void;
  inviteLabel?: string;
  muteAll?: { muted: boolean; busy: boolean; disabled: boolean; onToggle: () => void };
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-bold tracking-widest text-white/80">{label}</span>
        <span className="text-[10px] text-white/40">{count}</span>
      </div>
      <div className="flex items-center gap-2">
      {muteAll && (
        <button
          type="button"
          onClick={muteAll.onToggle}
          disabled={muteAll.busy || muteAll.disabled}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold disabled:opacity-40",
            muteAll.muted ? "border-red-400/50 bg-red-500/15 text-red-200" : "border-white/15 text-white/80 hover:bg-white/5",
          )}
        >
          {muteAll.muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          {muteAll.muted ? "Unmute all" : "Mute all"}
        </button>
      )}
      {canInvite && (
        <button
          onClick={onInvite}
          className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/5"
        >
          <UserPlus className="h-3 w-3" /> {inviteLabel ?? "Invite"}
        </button>
      )}
      </div>
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
                      <SignedImg src={p.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div
                        className="h-8 w-8 shrink-0 rounded-full"
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
  spotlightHostId,
  spotlightArtistId,
  spotlightCohostId,
  onPromote,
  onDemote,
  onRevoke,
  onKick,
  onDemoteToAudience,
  isStreamMod,
  onToggleModerator,
  onToggleMute,
  onSpotlight,
  hostSlotOpen = true,
}: {
  p: StageParticipant;
  kind: "host" | "co_host" | "speaker";
  canManage: boolean;
  isPrimaryHost?: boolean;
  isSelf?: boolean;
  hostTransferMode?: "co_host" | "transfer";
  spotlightHostId?: string | null;
  spotlightArtistId?: string | null;
  spotlightCohostId?: string | null;
  onPromote?: (mode: "host" | "co_host" | "transfer") => void;
  onDemote?: () => void;
  onRevoke?: () => void;
  onKick?: () => void;
  onDemoteToAudience?: () => void;
  isStreamMod?: boolean;
  onToggleModerator?: () => void;
  onToggleMute?: () => void;
  onSpotlight?: (slot: "host" | "artist" | "cohost", currentlyPinned: boolean) => void;
  hostSlotOpen?: boolean;
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
  const isHostSpot = spotlightHostId === p.user_id;
  const isArtistSpot = spotlightArtistId === p.user_id;
  const isCohostSpot = !!spotlightCohostId && spotlightCohostId === p.user_id;
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
    <div className="relative flex flex-col items-center gap-2 pt-3">
      <div className="absolute -top-0.5 left-1/2 z-30 -translate-x-1/2">
        <span
          className="whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold tracking-widest text-white shadow-lg shadow-black/50 ring-1 ring-black/40"
          style={{ background: badgeBg }}
        >
          {badgeLabel}
        </span>
      </div>

      <div
        className={cn(
          "relative rounded-full p-1 transition-transform duration-150",
          isSpeaking && "scale-110",
        )}
        style={{
          boxShadow: isSpeaking
            ? `0 0 48px ${ringColor}, 0 0 96px ${ringColor}cc, 0 0 160px ${ringColor}88`
            : `0 0 24px ${ringColor}66`,
          background: `conic-gradient(${ringColor}, transparent 70%, ${ringColor})`,
        }}
      >
        {isSpeaking && (
          <>
            <span
              className="pointer-events-none absolute inset-0 rounded-full animate-ping"
              style={{ boxShadow: `0 0 0 4px ${ringColor}`, opacity: 0.75 }}
            />
            <span
              className="pointer-events-none absolute -inset-2 rounded-full animate-ping"
              style={{ boxShadow: `0 0 0 2px ${ringColor}aa`, animationDuration: "1.4s" }}
            />
          </>
        )}
        <Link to="/artist/$id" params={{ id: p.user_id }}>
          {p.avatar_url ? (
            <SignedImg src={p.avatar_url} alt="" className="h-[96px] w-[96px] rounded-full border-2 border-[#0d0d18] object-cover" />
          ) : (
            <div
              className="h-[96px] w-[96px] rounded-full border-2 border-[#0d0d18]"
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
            <div className="absolute left-1/2 z-30 mt-1 w-[min(14rem,calc(100vw-3rem))] -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 bg-[#13131f] shadow-xl">
              {kind === "speaker" && onPromote && (
                <>
                  {onSpotlight && (
                    <>
                      <MenuItem
                        icon={isHostSpot ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setMenuOpen(false);
                          onSpotlight("host", isHostSpot);
                        }}
                      >
                        {isHostSpot ? "Remove from host box" : "Bring to host box"}
                      </MenuItem>
                      <MenuItem
                        icon={isArtistSpot ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setMenuOpen(false);
                          onSpotlight("artist", isArtistSpot);
                        }}
                      >
                        {isArtistSpot ? "Remove from artist video box" : "Bring to artist video box"}
                      </MenuItem>
                      <MenuItem
                        icon={isCohostSpot ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setMenuOpen(false);
                          onSpotlight("cohost", isCohostSpot);
                        }}
                      >
                        {isCohostSpot ? "Remove from co-host box" : "Bring to co-host box"}
                      </MenuItem>
                    </>
                  )}
                  <MenuDivider />
                  <MenuItem
                    icon={<Crown className="h-3.5 w-3.5" />}
                    disabled={hostSlotOpen === false}
                    title={hostSlotOpen ? undefined : "All Host slots are full"}
                    onClick={() => {
                      setMenuOpen(false);
                      onPromote("host");
                    }}
                  >
                    Bring to host slot
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
                  {onToggleModerator && !isSelf && (
                    <MenuItem
                      icon={<Shield className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleModerator();
                      }}
                    >
                      {isStreamMod ? "Remove from mod slot" : "Bring to mod slot"}
                    </MenuItem>
                  )}
                  {onToggleModerator && !isSelf && isStreamMod && (
                    <MenuItem
                      icon={<UserMinus className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleModerator();
                      }}
                    >
                      Demote to Guest
                    </MenuItem>
                  )}
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
                  {onSpotlight && (
                    <>
                      <MenuItem
                        icon={isHostSpot ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setMenuOpen(false);
                          onSpotlight("host", isHostSpot);
                        }}
                      >
                        {isHostSpot ? "Remove from host box" : "Bring to host box"}
                      </MenuItem>
                      <MenuItem
                        icon={isArtistSpot ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setMenuOpen(false);
                          onSpotlight("artist", isArtistSpot);
                        }}
                      >
                        {isArtistSpot ? "Remove from artist video box" : "Bring to artist video box"}
                      </MenuItem>
                      <MenuItem
                        icon={isCohostSpot ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setMenuOpen(false);
                          onSpotlight("cohost", isCohostSpot);
                        }}
                      >
                        {isCohostSpot ? "Remove from co-host box" : "Bring to co-host box"}
                      </MenuItem>
                    </>
                  )}
                  {onSpotlight && <MenuDivider />}
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
                      Demote to Guest
                    </MenuItem>
                  )}
                  {!isPrimaryHost && onToggleModerator && !isSelf && (
                    <MenuItem
                      icon={<Shield className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleModerator();
                      }}
                    >
                      {isStreamMod ? "Remove from mod slot" : "Bring to mod slot"}
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
  disabled,
  title,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5",
        danger ? "text-red-300" : "text-white/80",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
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
      className="group flex shrink-0 flex-col items-center gap-1"
      title={`View ${p.display_name ?? "listener"}'s page`}
    >
      <div
        className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full p-0.5 transition group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${BLUE}88, transparent)` }}
      >
        {p.avatar_url ? (
          <SignedImg
            src={p.avatar_url}
            alt={p.display_name ?? "Listener"}
            className="h-[58px] w-[58px] rounded-full border border-[#0d0d18] object-cover"
          />
        ) : (
          <div
            className="h-[58px] w-[58px] rounded-full border border-[#0d0d18]"
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

function EmptySlot({ label = "Open slot", color = "#ffffff" }: { label?: string; color?: string }) {
  return (
    <div className="group flex flex-col items-center gap-2">
      <div
        className="relative grid h-[96px] w-[96px] place-items-center rounded-full border border-dashed transition group-hover:scale-105"
        style={{
          borderColor: `${color}aa`,
          background: `radial-gradient(60% 60% at 50% 50%, ${color}22, transparent 70%)`,
        }}
      >
        <span className="text-lg font-thin" style={{ color }}>
          +
        </span>
      </div>
      <div
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: `${color}dd` }}
      >
        {label}
      </div>
    </div>
  );
}

function MoreOpenChip({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="grid h-[96px] w-[96px] place-items-center rounded-full border text-center"
        style={{
          borderColor: `${color}55`,
          background: `radial-gradient(60% 60% at 50% 50%, ${color}18, transparent 70%)`,
          boxShadow: `inset 0 0 16px ${color}22`,
        }}
      >
        <div>
          <div className="text-lg font-black leading-none text-white" style={{ textShadow: `0 0 12px ${color}aa` }}>
            +{count}
          </div>
          <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest" style={{ color: `${color}cc` }}>
            open
          </div>
        </div>
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${color}77` }}>
        more seats
      </div>
    </div>
  );
}

function CapacityChip({
  label,
  filled,
  total,
  color,
}: {
  label: string;
  filled: number;
  total: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (filled / total) * 100));
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 backdrop-blur"
      style={{ boxShadow: `inset 0 0 12px ${color}22` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">{label}</span>
      <span className="text-[11px] font-black tabular-nums text-white">
        {filled}
        <span className="text-white/40">/{total}</span>
      </span>
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </span>
    </div>
  );
}
