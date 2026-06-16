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
import { Track, ConnectionQuality } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Camera, CameraOff, MonitorUp, UserPlus, Settings, PhoneOff, Wifi, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RecordButton } from "./RecordButton";
import { supabase } from "@/integrations/supabase/client";
import { DeviceSelector } from "./DeviceSelector";

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
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={publish}
      audio={publish}
      onError={(e) => toast.error(`Stream error: ${e.message}`)}
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
  const prev = useRef<boolean | null>(null);
  useEffect(() => {
    if (!localParticipant) return;
    (async () => {
      try {
        await localParticipant.setMicrophoneEnabled(publish);
        await localParticipant.setCameraEnabled(publish);
        if (prev.current === false && publish) {
          toast.success("You're on stage — mic and camera enabled");
        } else if (prev.current === true && !publish) {
          toast.info("You're back in the crowd");
        }
        prev.current = publish;
      } catch (e: any) {
        if (publish) toast.error(e?.message || "Could not enable mic/camera");
      }
    })();
  }, [publish, localParticipant]);
  return null;
}

function StageInner({ onEnd, onInvite, hostImage, guestImage, onViewerCount, streamId, publish, showHostTools = true }: { onEnd: () => void; onInvite: () => void; hostImage?: string; guestImage?: string; onViewerCount?: (n: number) => void; streamId?: string; publish?: boolean; showHostTools?: boolean }) {
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

  // Bucket camera tracks by role panel.
  type Panel = "admin" | "middle" | "host";
  const buckets: Record<Panel, typeof cameraTracks> = { admin: [], middle: [], host: [] };
  for (const t of cameraTracks) {
    const id = t.participant?.identity ?? "";
    const role = roleMap[id];
    const panel: Panel =
      role === "admin" || role === "administrator" || role === "owner" || role === "moderator"
        ? "admin"
        : role === "host" || role === "cohost" || role === "co_host"
          ? "host"
          : "middle"; // artist | guest | listener | speaker | unknown
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
          {renderPanel("admin", "ADMIN", "Waiting for Administrator")}
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
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      if (cancelled) return;
      const next: Record<string, ProfileLite> = {};
      (data ?? []).forEach((p: any) => { next[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
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
    <div className={cn("stage-tile-glow relative aspect-video rounded-2xl p-[2px]", small && "rounded-xl")}>
      <div className="stage-tile relative h-full w-full overflow-hidden rounded-[14px] bg-[#0d0d18]">
      {track ? (
        <TrackRefContext.Provider value={track}>
          <ParticipantTile className="!h-full !w-full" />
        </TrackRefContext.Provider>
      ) : avatar ? (
        <>
          <img src={avatar} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
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