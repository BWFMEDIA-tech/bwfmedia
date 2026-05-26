import {
  LiveKitRoom,
  useTracks,
  useLocalParticipant,
  useParticipants,
  ParticipantTile,
  TrackRefContext,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionQuality } from "livekit-client";
import { useEffect, useState } from "react";
import { Mic, MicOff, Camera, CameraOff, MonitorUp, UserPlus, Settings, PhoneOff, Wifi, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

interface LiveStageProps {
  token: string;
  serverUrl: string;
  onEnd: () => void;
  onInvite: () => void;
  hostImage?: string;
  guestImage?: string;
}

export function LiveStage({ token, serverUrl, onEnd, onInvite, hostImage, guestImage }: LiveStageProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video
      audio
      onError={(e) => toast.error(`Stream error: ${e.message}`)}
      className="contents"
    >
      <StageInner onEnd={onEnd} onInvite={onInvite} hostImage={hostImage} guestImage={guestImage} />
    </LiveKitRoom>
  );
}

function StageInner({ onEnd, onInvite, hostImage, guestImage }: { onEnd: () => void; onInvite: () => void; hostImage?: string; guestImage?: string }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const participants = useParticipants();
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera);

  // Pick the first two for the two-up layout (host + guest)
  const slots = [0, 1].map((i) => cameraTracks[i] ?? null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <StageTile track={slots[0]} label="HOST" fallbackImage={hostImage} />
        <StageTile track={slots[1]} label="GUEST" fallbackImage={guestImage} placeholder={`Waiting for guest (${Math.max(0, participants.length - 1)} in room)`} />
      </div>
      <StreamControlBar onEnd={onEnd} onInvite={onInvite} />
    </>
  );
}

function StageTile({ track, label, fallbackImage, placeholder }: { track: any; label: string; fallbackImage?: string; placeholder?: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/5 bg-[#0d0d18]">
      {track ? (
        <TrackRefContext.Provider value={track}>
          <ParticipantTile className="!h-full !w-full" />
        </TrackRefContext.Provider>
      ) : fallbackImage ? (
        <>
          <img src={fallbackImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
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
        <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold tracking-widest text-white backdrop-blur">
          {label}
        </span>
      </div>
      {track?.participant && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-black/50 px-3 py-2 backdrop-blur">
          <div className="h-8 w-8 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
          <div>
            <div className="flex items-center gap-1 text-sm font-bold text-white">
              {track.participant.name || track.participant.identity}
              <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />
            </div>
            <div className="text-[10px] text-white/60">{track.participant.isLocal ? "you" : "live"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StreamControlBar({ onEnd, onInvite }: { onEnd: () => void; onInvite: () => void }) {
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
      <CtrlBtn icon={Settings} label="Settings" onClick={() => toast.info("Device settings coming soon")} />
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