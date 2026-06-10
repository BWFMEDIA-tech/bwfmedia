import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useState } from "react";
import { Mic, MicOff, Radio, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StageConnectionProvider } from "@/lib/stage-connection-context";

/**
 * Wraps stage-mode (audio-only) UI in a LiveKit room.
 * Shows a "Join audio" prompt first so the browser captures the user gesture
 * required to open the microphone. Once connected, the mic is automatically
 * enabled for hosts/speakers and muted for listeners, based on
 * `stage_participants.stage_role`.
 */
export function StageAudioShell({
  token,
  serverUrl,
  streamId,
  userId,
  isHost,
  children,
  onLeave,
}: {
  token: string;
  serverUrl: string;
  streamId: string;
  userId: string;
  isHost?: boolean;
  children: React.ReactNode;
  onLeave?: () => void;
}) {
  const [connect, setConnect] = useState(false);
  const [me, setMe] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (active) setMe((data as any) ?? null);
    })();
    return () => { active = false; };
  }, [userId]);

  if (!connect) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-10 text-center">
        {me?.avatar_url ? (
          <img
            src={me.avatar_url}
            alt=""
            className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-[#8b5cf6] object-cover shadow-[0_0_24px_rgba(139,92,246,0.4)]"
          />
        ) : (
          <div
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#8b5cf6]"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)" }}
          >
            <Mic className="h-6 w-6 text-white" />
          </div>
        )}
        <div className="mb-1 text-sm font-bold text-white">
          {isHost ? `Join as host${me?.display_name ? ` — ${me.display_name}` : ""}` : `Join the stage room${me?.display_name ? ` as ${me.display_name}` : ""}`}
        </div>
        <p className="mb-4 text-xs text-white/60">
          {isHost
            ? "Click to connect your microphone and start hosting."
            : "Click to connect. You'll be muted until the host promotes you."}
        </p>
        <button
          onClick={() => setConnect(true)}
          className="rounded-md px-4 py-2 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)" }}
        >
          <Radio className="mr-1 inline h-3.5 w-3.5" />
          {isHost ? "Join as host" : "Join audio"}
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={false}
      onError={(e) => toast.error(`Stage audio: ${e.message}`)}
      className="contents"
    >
      <StageConnectionProvider>
        <RoomAudioRenderer />
        <StageMicSync streamId={streamId} userId={userId} />
        {children}
        <StageMicBar onLeave={onLeave} />
      </StageConnectionProvider>
    </LiveKitRoom>
  );
}

function StageMicSync({ streamId, userId }: { streamId: string; userId: string }) {
  const { localParticipant } = useLocalParticipant();
  const [role, setRole] = useState<string | null>(null);
  const [prevCanSpeak, setPrevCanSpeak] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const fetchRole = async () => {
      const { data } = await supabase
        .from("stage_participants")
        .select("stage_role")
        .eq("stream_id", streamId)
        .eq("user_id", userId)
        .maybeSingle();
      if (active) setRole((data?.stage_role as string | undefined) ?? null);
    };
    fetchRole();
    const ch = supabase
      .channel(`stage-mic-${streamId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stage_participants", filter: `stream_id=eq.${streamId}` },
        fetchRole,
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [streamId, userId]);

  useEffect(() => {
    if (!localParticipant) return;
    const canSpeak = role === "host" || role === "speaker";
    localParticipant.setMicrophoneEnabled(canSpeak).catch(() => {});
    if (prevCanSpeak === false && canSpeak) {
      toast.success("You're on stage — mic enabled");
    } else if (prevCanSpeak === true && !canSpeak) {
      toast.info("You're back in the audience");
    }
    setPrevCanSpeak(canSpeak);
  }, [role, localParticipant]);

  return null;
}

function StageMicBar({ onLeave }: { onLeave?: () => void }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();

  const toggleMic = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e: any) {
      toast.error(e?.message || "Could not toggle mic");
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <button
        onClick={toggleMic}
        className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/5"
      >
        {isMicrophoneEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-red-400" />}
        {isMicrophoneEnabled ? "Mute" : "Unmute"}
      </button>
      {onLeave && (
        <button
          onClick={async () => {
            await room?.disconnect();
            onLeave();
          }}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
        >
          <PhoneOff className="h-3.5 w-3.5" /> Leave
        </button>
      )}
    </div>
  );
}