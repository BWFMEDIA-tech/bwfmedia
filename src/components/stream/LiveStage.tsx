import {
  LiveKitRoom,
  useTracks,
  useLocalParticipant,
  useParticipants,
  ParticipantTile,
  TrackRefContext,
  useRoomContext,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionQuality, RoomEvent, type Participant } from "livekit-client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff, Camera, CameraOff, MonitorUp, UserPlus, Settings, PhoneOff, Wifi, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RecordButton } from "./RecordButton";
import { supabase } from "@/integrations/supabase/client";
import { DeviceSelector } from "./DeviceSelector";
import { classifyLiveKitError, LiveKitFatalBanner, type LiveKitFatalKind } from "./LiveKitConnectionGuard";
import { setRealtimeHealth } from "@/lib/realtime-health";
import { useServerFn } from "@tanstack/react-start";
import { setStreamSpotlight } from "@/lib/stage.functions";
import { Pin, PinOff, X as XIcon } from "lucide-react";
import { SignedImg } from "@/components/ui/signed-img";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

interface LiveStageProps {
  token: string;
  serverUrl: string;
  onEnd: () => void;
  onInvite: () => void;
  hostImage?: string;
  guestImage?: string;
  onViewerCount?: (n: number) => void;
  streamId?: string;
  /** Whether to auto-publish the local camera/mic. Default true (host/guest on stage). Pass false for crowd viewers. */
  publish?: boolean;
  /** Show host/admin LiveKit controls (mic, camera, screen-share, end stream, device selector). */
  showHostTools?: boolean;
}

export function LiveStage({ token, serverUrl, onEnd, onInvite, hostImage, guestImage, onViewerCount, streamId, publish = true, showHostTools = true }: LiveStageProps) {
  const [fatal, setFatal] = useState<{ kind: LiveKitFatalKind; detail: string } | null>(null);

  // Publish health to the global store; reset on unmount so other surfaces
  // (chat, queue) don't see stale "degraded" state after the user leaves.
  useEffect(() => {
    if (!fatal) {
      setRealtimeHealth("livekit", "connected");
      return;
    }
    const status =
      fatal.kind === "quota"
        ? "quota_exceeded"
        : fatal.kind === "auth"
          ? "auth_failed"
          : "degraded";
    setRealtimeHealth("livekit", status, fatal.detail);
  }, [fatal]);
  useEffect(() => () => setRealtimeHealth("livekit", "connected"), []);

  if (fatal) {
    // Degraded mode: keep parent UI (chat, queue, stage list) alive — render
    // a compact inline status where the video tiles would have been, instead
    // of replacing the whole route.
    return (
      <LiveKitFatalBanner
        kind={fatal.kind}
        detail={fatal.detail}
        onRetry={() => setFatal(null)}
      />
    );
  }
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={!fatal}
      video={false}
      audio={false}
      onError={(e) => {
        const kind = classifyLiveKitError(e);
        if (kind) {
          setFatal({ kind, detail: e instanceof Error ? e.message : String(e) });
          return;
        }
        toast.error(`Stream error: ${friendlyDeviceError(e)}`);
      }}
      onMediaDeviceFailure={(failure) => toast.error(friendlyDeviceError(failure))}
      className="contents"
    >
      <RoomAudioRenderer />
      <StageInner onEnd={onEnd} onInvite={onInvite} hostImage={hostImage} guestImage={guestImage} onViewerCount={onViewerCount} streamId={streamId} publish={publish} showHostTools={showHostTools} />
      <PublishSync publish={publish} />
    </LiveKitRoom>
  );
}

function PublishSync({ publish }: { publish: boolean }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const prev = useRef<boolean | null>(null);
  const [permissionTick, setPermissionTick] = useState(0);
  useEffect(() => {
    if (!room) return;
    const onPermissionsChanged = (_prev: unknown, participant: Participant) => {
      if (participant.identity === localParticipant?.identity) {
        setPermissionTick((tick) => tick + 1);
      }
    };
    room.on(RoomEvent.ParticipantPermissionsChanged, onPermissionsChanged);
    return () => {
      room.off(RoomEvent.ParticipantPermissionsChanged, onPermissionsChanged);
    };
  }, [room, localParticipant?.identity]);

  useEffect(() => {
    if (!localParticipant) return;
    (async () => {
      if (!publish) {
        await Promise.allSettled([
          localParticipant.setMicrophoneEnabled(false),
          localParticipant.setCameraEnabled(false),
        ]);
        if (prev.current === true) toast.info("You're back in the crowd");
        prev.current = false;
        return;
      }
      if (localParticipant.permissions?.canPublish === false) return;

      const [micResult, cameraResult] = await Promise.allSettled([
        localParticipant.setMicrophoneEnabled(true),
        localParticipant.setCameraEnabled(true),
      ]);

      if (micResult.status === "rejected") {
        toast.error(friendlyDeviceError(micResult.reason));
      }
      if (cameraResult.status === "rejected") {
        toast.error(friendlyDeviceError(cameraResult.reason));
      }
      if (micResult.status === "fulfilled" || cameraResult.status === "fulfilled") {
        if (prev.current === false && publish) {
          toast.success("You're on stage");
        }
        prev.current = publish;
      }
    })();
  }, [publish, localParticipant, permissionTick]);
  return null;
}

function friendlyDeviceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  if (/notfound|requested device not found|no device/i.test(`${name} ${message}`)) {
    return "No camera or microphone was found. You can still stay live and connect a device anytime.";
  }
  if (/notallowed|permission|denied/i.test(`${name} ${message}`)) {
    return "Allow camera and microphone permissions in your browser to broadcast.";
  }
  return message || "Could not enable camera or microphone.";
}

export function LiveStageContent({ onEnd, onInvite, hostImage, guestImage, onViewerCount, streamId, publish, showHostTools = true }: { onEnd: () => void; onInvite: () => void; hostImage?: string; guestImage?: string; onViewerCount?: (n: number) => void; streamId?: string; publish?: boolean; showHostTools?: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const participants = useParticipants();
  // Only keep camera tracks that are actually published (drop placeholders for
  // listeners/crowd viewers who have no camera). Otherwise the first slot can
  // become the local viewer's empty placeholder and hide the real guest.
  const cameraTracks = tracks.filter(
    (t) => t.source === Track.Source.Camera && (t as any).publication?.track,
  );

  useEffect(() => {
    onViewerCount?.(participants.length);
  }, [participants.length, onViewerCount]);

  const profiles = useParticipantProfiles(participants.map((p) => p.identity));
  const roleMap = useParticipantRoles(streamId, participants.map((p) => p.identity));
  const spotlight = useStreamSpotlight(streamId);

  // Bucket camera tracks by role panel.
  type Panel = "admin" | "middle" | "host";
  const buckets: Record<Panel, typeof cameraTracks> = { admin: [], middle: [], host: [] };
  for (const t of cameraTracks) {
    const id = t.participant?.identity ?? "";
    // Spotlight overrides: pin a participant exclusively to a panel.
    if (spotlight.host && id === spotlight.host) {
      buckets.admin.push(t);
      continue;
    }
    if (spotlight.artist && id === spotlight.artist) {
      buckets.middle.push(t);
      continue;
    }
    const role = roleMap[id];
    const panel: Panel =
      role === "admin" || role === "administrator" || role === "owner" || role === "moderator"
        ? "admin"
        : role === "host" || role === "cohost" || role === "co_host"
          ? "host"
          : "middle"; // artist | guest | listener | speaker | unknown
    // When a spotlight is active for a panel, suppress catch-alls there.
    if (spotlight.artist && panel === "middle") continue;
    if (spotlight.host && panel === "admin") continue;
    buckets[panel].push(t);
  }
  // Priority: active speaker first within each bucket.
  const sortByActive = (arr: typeof cameraTracks) =>
    [...arr].sort((a, b) => Number(!!b.participant?.isSpeaking) - Number(!!a.participant?.isSpeaking));

  const renderPanel = (panel: Panel, label: string, placeholder: string, fallback?: string) => {
    const items = sortByActive(buckets[panel]);
    const primary = items[0] ?? null;
    const primaryId = primary?.participant?.identity ?? null;
    return (
      <div className="flex flex-col gap-2">
        <StageTile
          track={primary}
          label={label}
          fallbackImage={fallback}
          profile={primaryId ? profiles[primaryId] : undefined}
          placeholder={placeholder}
        />
        {panel === "middle" && showHostTools && streamId && (
          <SpotlightControls
            streamId={streamId}
            spotlightUserId={spotlight.artist}
            participants={participants}
            profiles={profiles}
            slot="artist"
          />
        )}
        {panel === "admin" && showHostTools && streamId && (
          <SpotlightControls
            streamId={streamId}
            spotlightUserId={spotlight.host}
            participants={participants}
            profiles={profiles}
            slot="host"
          />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop / tablet: 3-column grid. Mobile: swipeable horizontal carousel. */}
      <div
        className={cn(
          "gap-4",
          "flex snap-x snap-mandatory overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:grid md:grid-cols-3 md:items-start md:overflow-visible md:pb-0",
        )}
      >
        <div className="min-w-[88%] shrink-0 snap-center md:min-w-0">
          {renderPanel("admin", "HOST", "Waiting for Host")}
        </div>
        <div className="min-w-[88%] shrink-0 snap-center md:min-w-0">
          {renderPanel("middle", "ARTIST", "Waiting for Artist", guestImage)}
        </div>
        <div className="min-w-[88%] shrink-0 snap-center md:min-w-0">
          {renderPanel("host", "HOST", "Waiting for Host", hostImage)}
        </div>
      </div>
      {showHostTools && <StreamControlBar onEnd={onEnd} onInvite={onInvite} streamId={streamId} />}
    </>
  );
}

const StageInner = LiveStageContent;

/**
 * Camera-only publish sync. Use inside an existing LiveKitRoom (e.g. the
 * persistent StageAudioShell) so flipping UI modes turns the camera on/off
 * WITHOUT touching the microphone or the room connection.
 */
export function CameraPublishSync({ publish }: { publish: boolean }) {
  const { localParticipant } = useLocalParticipant();
  useEffect(() => {
    if (!localParticipant) return;
    localParticipant.setCameraEnabled(publish).catch((err) => {
      // Soft-fail: no camera attached is fine.
      console.warn("[live-stage] setCameraEnabled failed", err);
    });
  }, [publish, localParticipant]);
  return null;
}

/**
 * Resolve LiveKit identities → role string for 3-panel broadcast routing.
 * Combines `user_roles` (admin/moderator) with `stage_participants.stage_role`
 * (host/co_host/speaker/listener), subscribed in realtime so role changes
 * move feeds across panels without a refresh.
 */
function useParticipantRoles(streamId: string | undefined, identities: string[]): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  const key = [...new Set(identities)].sort().join(",");
  useEffect(() => {
    const ids = [...new Set(identities)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!ids.length) { setMap({}); return; }
    let cancelled = false;
    const refresh = async () => {
      const next: Record<string, string> = {};
      const [{ data: adminRows }, stageRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        streamId
          ? supabase.from("stage_participants").select("user_id, stage_role").eq("stream_id", streamId).in("user_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      (stageRes.data ?? []).forEach((r: any) => { next[r.user_id] = r.stage_role; });
      // Admin/moderator overrides stage role for left-panel routing.
      (adminRows ?? []).forEach((r: any) => {
        if (r.role === "admin" || r.role === "moderator" || r.role === "owner" || r.role === "administrator") {
          next[r.user_id] = r.role;
        }
      });
      if (!cancelled) setMap(next);
    };
    refresh();
    const ch = streamId
      ? supabase
          .channel(`lk-roles-${streamId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "stage_participants", filter: `stream_id=eq.${streamId}` }, refresh)
          .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, refresh)
          .subscribe()
      : null;
    return () => { cancelled = true; if (ch) supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, streamId]);
  return map;
}

type ProfileLite = { display_name: string | null; avatar_url: string | null };

function useParticipantProfiles(identities: string[]): Record<string, ProfileLite> {
  const [map, setMap] = useState<Record<string, ProfileLite>>({});
  const key = [...new Set(identities)].sort().join(",");
  useEffect(() => {
    const ids = [...new Set(identities)].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!ids.length) { setMap({}); return; }
    let cancelled = false;
    (async () => {
      const { IDENTITY_COLUMNS, effectiveIdentity } = await import("@/lib/host-identity");
      const { data } = await supabase
        .from("profiles")
        .select(IDENTITY_COLUMNS)
        .in("id", ids);
      if (cancelled) return;
      const next: Record<string, ProfileLite> = {};
      (data ?? []).forEach((p: any) => {
        const eff = effectiveIdentity(p);
        next[p.id] = { display_name: eff.display_name, avatar_url: eff.avatar_url };
      });
      setMap(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

function StageTile({ track, label, fallbackImage, placeholder, profile, small }: { track: any; label: string; fallbackImage?: string; placeholder?: string; profile?: ProfileLite; small?: boolean }) {
  const avatar = profile?.avatar_url ?? fallbackImage;
  return (
    <div className={cn("stage-tile-glow relative mx-auto aspect-video w-full rounded-2xl p-[2px]", small && "rounded-xl")}>
      <div className="stage-tile relative h-full w-full overflow-hidden rounded-[14px] bg-[#0d0d18]">
      {track ? (
        <TrackRefContext.Provider value={track}>
          <ParticipantTile className="!h-full !w-full" />
        </TrackRefContext.Provider>
      ) : avatar ? (
        <>
          <SignedImg src={avatar} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white/70">
            {placeholder ?? "Connecting…"}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] to-[#581c87] text-xs text-white/70">
          {placeholder ?? "Connecting…"}
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3">
        <span className={cn("rounded-md bg-black/60 px-2 py-1 font-bold tracking-widest text-white backdrop-blur", small ? "text-[9px]" : "text-[10px]")}>
          {label}
        </span>
      </div>
      </div>
    </div>
  );
}

function StreamControlBar({ onEnd, onInvite, streamId }: { onEnd: () => void; onInvite: () => void; streamId?: string }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);

  useEffect(() => {
    if (!localParticipant) return;
    const update = () => setQuality(localParticipant.connectionQuality);
    update();
    localParticipant.on("connectionQualityChanged" as any, update);
    return () => { localParticipant.off("connectionQualityChanged" as any, update); };
  }, [localParticipant]);

  const toggleMic = async () => {
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };
  const toggleCam = async () => {
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  };
  const toggleShare = async () => {
    const next = !sharing;
    try {
      await localParticipant.setScreenShareEnabled(next);
      setSharing(next);
    } catch (e: any) {
      toast.error(e?.message || "Screen share failed");
    }
  };

  const qualityLabel = quality === ConnectionQuality.Excellent ? "Excellent"
    : quality === ConnectionQuality.Good ? "Good"
    : quality === ConnectionQuality.Poor ? "Poor" : "Connecting";
  const qualityColor = quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good ? "#22c55e"
    : quality === ConnectionQuality.Poor ? "#f59e0b" : "#94a3b8";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mr-2 flex items-center gap-2 px-2">
        <Wifi className="h-3.5 w-3.5" style={{ color: qualityColor }} />
        <div className="text-xs">
          <div className="font-semibold text-white">LiveKit</div>
          <div className="text-[10px] text-white/50">{qualityLabel} connection</div>
        </div>
      </div>
      <CtrlBtn icon={micOn ? Mic : MicOff} label={micOn ? "Mute" : "Unmute"} onClick={toggleMic} active={!micOn} />
      <CtrlBtn icon={camOn ? Camera : CameraOff} label={camOn ? "Stop Cam" : "Start Cam"} onClick={toggleCam} active={!camOn} />
      <CtrlBtn icon={MonitorUp} label={sharing ? "Stop Share" : "Share Screen"} onClick={toggleShare} active={sharing} />
      <CtrlBtn icon={UserPlus} label="Invite Guest" onClick={onInvite} />
      {streamId && <RecordButton streamId={streamId} />}
      <DeviceSelector compact />
      <button
        onClick={async () => { await room?.disconnect(); onEnd(); }}
        className="ml-auto flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
      >
        <PhoneOff className="h-3.5 w-3.5" />
        End Stream
      </button>
    </div>
  );
}

function CtrlBtn({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2 text-xs font-medium transition hover:bg-white/5",
        active ? "bg-white/10 text-white" : "text-white/80",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

type SpotlightStore = {
  current: { host: string | null; artist: string | null };
  channel: ReturnType<typeof supabase.channel> | null;
  listeners: Set<() => void>;
};

const spotlightStores = new Map<string, SpotlightStore>();

function getSpotlightStore(streamId: string): SpotlightStore {
  let store = spotlightStores.get(streamId);
  if (!store) {
    store = { current: { host: null, artist: null }, channel: null, listeners: new Set() };
    spotlightStores.set(streamId, store);

    const channel = supabase.channel(`spotlight-${streamId}`);
    store.channel = channel;

    // Register postgres_changes callback BEFORE calling subscribe().
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "streams", filter: `id=eq.${streamId}` },
      (payload) => {
        const row = payload.new as any;
        const next = {
          artist: row?.spotlight_user_id ?? null,
          host: row?.spotlight_host_user_id ?? null,
        };
        if (
          store!.current.host === next.host &&
          store!.current.artist === next.artist
        )
          return;
        store!.current = next;
        store!.listeners.forEach((cb) => cb());
      },
    );

    channel.subscribe((status, err) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[useStreamSpotlight] realtime channel error:", err);
      }
    });

    (async () => {
      try {
        const { data } = await supabase
          .from("streams")
          .select("spotlight_user_id, spotlight_host_user_id")
          .eq("id", streamId)
          .maybeSingle();
        const live = spotlightStores.get(streamId);
        if (!live || live !== store) return;
        const next = {
          artist: (data as any)?.spotlight_user_id ?? null,
          host: (data as any)?.spotlight_host_user_id ?? null,
        };
        if (
          live.current.host === next.host &&
          live.current.artist === next.artist
        )
          return;
        live.current = next;
        live.listeners.forEach((cb) => cb());
      } catch (err) {
        console.error("[useStreamSpotlight] initial fetch failed:", err);
      }
    })();
  }
  return store;
}

function subscribeSpotlight(streamId: string, callback: () => void): () => void {
  const store = getSpotlightStore(streamId);
  store.listeners.add(callback);
  return () => {
    store.listeners.delete(callback);
    if (store.listeners.size === 0) {
      if (store.channel) {
        supabase.removeChannel(store.channel);
        store.channel = null;
      }
      spotlightStores.delete(streamId);
    }
  };
}

const EMPTY_SPOTLIGHT = { host: null, artist: null } as const;
export type SpotlightState = { host: string | null; artist: string | null };
function getSpotlightSnapshot(streamId: string): SpotlightState {
  return spotlightStores.get(streamId)?.current ?? EMPTY_SPOTLIGHT;
}

/**
 * Real-time hook: returns the current spotlighted user id for the stream,
 * or null. Updates instantly when a host pins/unpins via Postgres realtime.
 *
 * Uses a single shared realtime subscription per streamId so re-renders and
 * multiple mounted instances never register duplicate postgres_changes listeners.
 */
export function useStreamSpotlight(streamId: string | undefined): SpotlightState {
  return useSyncExternalStore(
    useCallback(
      (callback) => (streamId ? subscribeSpotlight(streamId, callback) : () => {}),
      [streamId],
    ),
    useCallback(() => (streamId ? getSpotlightSnapshot(streamId) : EMPTY_SPOTLIGHT), [streamId]),
    () => EMPTY_SPOTLIGHT,
  );
}

/**
 * Host-only control row under the middle ARTIST panel. Lets the host pin
 * any participant currently in the room into that slot, or clear it.
 */
function SpotlightControls({
  streamId,
  spotlightUserId,
  participants,
  profiles,
  slot = "artist",
}: {
  streamId: string;
  spotlightUserId: string | null;
  participants: ReturnType<typeof useParticipants>;
  profiles: Record<string, ProfileLite>;
  slot?: "host" | "artist";
}) {
  const [open, setOpen] = useState(false);
  const setSpotlight = useServerFn(setStreamSpotlight);
  const pinned = spotlightUserId
    ? profiles[spotlightUserId] ?? null
    : null;
  const slotLabel = slot === "host" ? "host box" : "artist box";
  const pin = async (targetUserId: string | null) => {
    try {
      await setSpotlight({ data: { streamId, targetUserId, slot } });
      setOpen(false);
      toast.success(targetUserId ? `Pinned to ${slotLabel}` : "Spotlight cleared");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update spotlight");
    }
  };
  // Only show participants with a real uuid identity (skip ghost / placeholder ids)
  const pickable = participants.filter((p) =>
    /^[0-9a-f-]{36}$/i.test(p.identity ?? ""),
  );
  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
        <div className="flex items-center gap-2 text-[11px] text-white/70">
          <Pin className="h-3 w-3 text-fuchsia-400" />
          {pinned ? (
            <span className="truncate">
              Pinned: <span className="font-semibold text-white">{pinned.display_name ?? "Guest"}</span>
            </span>
          ) : (
            <span>No spotlight</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/85 hover:bg-white/5"
          >
            <UserPlus className="h-3 w-3" /> Add Guest
          </button>
          {spotlightUserId && (
            <button
              onClick={() => pin(null)}
              className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/85 hover:bg-white/5"
            >
              <PinOff className="h-3 w-3" /> Unpin
            </button>
          )}
        </div>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d18] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-bold text-white">Pin to {slotLabel}</div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {pickable.length === 0 ? (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-white/50">
                No one is in the room yet. Invite a guest first.
              </div>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {pickable.map((p) => {
                  const prof = profiles[p.identity];
                  const isCurrent = p.identity === spotlightUserId;
                  return (
                    <li key={p.identity}>
                      <button
                        onClick={() => pin(p.identity)}
                        disabled={isCurrent}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5",
                          isCurrent && "opacity-50",
                        )}
                      >
                        {prof?.avatar_url ? (
                          <SignedImg src={prof.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-fuchsia-600 to-blue-600" />
                        )}
                        <span className="flex-1 text-sm text-white">
                          {prof?.display_name ?? p.name ?? "Guest"}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-300">
                          {isCurrent ? "Pinned" : "Pin"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}