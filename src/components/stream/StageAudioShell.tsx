import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useEffect, useMemo, useState } from "react";
import {
  RoomEvent,
  Track,
  ConnectionState,
  type Participant,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from "livekit-client";
import type { LocalAudioTrack } from "livekit-client";
import { Mic, MicOff, Radio, PhoneOff, Activity, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StageConnectionProvider } from "@/lib/stage-connection-context";
import { DeviceSelector } from "./DeviceSelector";

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
        <AudioPlaybackUnblocker />
        <ParticipantAudioLogger />
        <ReconnectAudioGuard />
        {children}
        <StageDiagnostics />
        <StageMicBar onLeave={onLeave} />
      </StageConnectionProvider>
    </LiveKitRoom>
  );
}

function StageMicSync({ streamId, userId }: { streamId: string; userId: string }) {
  const { localParticipant } = useLocalParticipant();
  const [role, setRole] = useState<string | null>(null);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [prevCanSpeak, setPrevCanSpeak] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const fetchRole = async () => {
      const { data } = await supabase
        .from("stage_participants")
        .select("stage_role, muted_until")
        .eq("stream_id", streamId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      setRole((data?.stage_role as string | undefined) ?? null);
      setMutedUntil(((data as any)?.muted_until as string | null | undefined) ?? null);
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
    const isHostMuted = !!mutedUntil && new Date(mutedUntil).getTime() > Date.now();
    const hasStageRole = role === "host" || role === "co_host" || role === "speaker";
    const canSpeak = hasStageRole && !isHostMuted;
    // Auto-enable mic for stage roles. For listeners/guests we do NOT
    // force-disable here — that would override their manual Unmute tap on
    // iOS / iPad / desktop. The host can still mute them via `muted_until`.
    if (canSpeak) {
      localParticipant
        .setMicrophoneEnabled(true)
        .then(() => {
          console.log("[stage-audio] Mic enabled for stage role", { role });
        })
        .catch((err) => {
          console.error("[stage-audio] Audio device error", err);
          toast.error(err?.message || "Microphone unavailable");
        });
    } else if (isHostMuted) {
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
    if (prevCanSpeak === false && canSpeak) {
      toast.success("You're on stage — mic enabled");
    } else if (prevCanSpeak === true && !canSpeak) {
      toast.info(isHostMuted ? "You've been muted by the host" : "You're back in the audience");
    }
    setPrevCanSpeak(canSpeak);
  }, [role, mutedUntil, localParticipant]);

  return null;
}

/**
 * Surfaces an "Enable audio" prompt when the browser blocks autoplay so the
 * user can satisfy the gesture requirement without refreshing.
 */
function AudioPlaybackUnblocker() {
  const room = useRoomContext();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!room) return;
    const update = () => setBlocked(!room.canPlaybackAudio);
    update();
    room.on(RoomEvent.AudioPlaybackStatusChanged, update);
    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, update);
    };
  }, [room]);

  if (!blocked) return null;
  return (
    <button
      onClick={async () => {
        try {
          await room?.startAudio();
          toast.success("Audio enabled");
        } catch (e: any) {
          toast.error(e?.message || "Couldn't start audio");
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
    >
      <VolumeX className="h-3.5 w-3.5" /> Browser blocked audio — click to enable
    </button>
  );
}

/** Console-logs participant + track lifecycle so the audio pipeline is debuggable. */
function ParticipantAudioLogger() {
  const room = useRoomContext();
  useEffect(() => {
    if (!room) return;
    const onConnected = (p: Participant) => {
      console.log("[stage-audio] Participant connected", p.identity);
    };
    const onDisconnected = (p: Participant) => {
      console.log("[stage-audio] Participant disconnected", p.identity);
    };
    const onSubscribed = (
      _track: unknown,
      pub: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (pub.kind === Track.Kind.Audio) {
        console.log("[stage-audio] Audio track subscribed", {
          from: participant.identity,
          trackSid: pub.trackSid,
        });
      }
    };
    const onState = (state: ConnectionState) => {
      console.log("[stage-audio] Connection state:", state);
    };
    const onSpeakers = (speakers: Participant[]) => {
      if (speakers.length) {
        console.log(
          "[stage-audio] Participant speaking",
          speakers.map((s) => s.identity),
        );
      }
    };
    room.on(RoomEvent.ParticipantConnected, onConnected);
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected);
    room.on(RoomEvent.TrackSubscribed, onSubscribed as any);
    room.on(RoomEvent.ConnectionStateChanged, onState);
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onConnected);
      room.off(RoomEvent.ParticipantDisconnected, onDisconnected);
      room.off(RoomEvent.TrackSubscribed, onSubscribed as any);
      room.off(RoomEvent.ConnectionStateChanged, onState);
      room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers);
    };
  }, [room]);
  return null;
}

/**
 * Hardens audio across temporary disconnects, network blips, and refreshes:
 *  - Re-subscribes to every remote audio publication on Reconnected /
 *    ParticipantConnected / TrackPublished events (in case the SFU dropped
 *    or unsubscribed the renderer mid-flight).
 *  - Re-publishes the local mic if it was enabled before the disconnect but
 *    the track was torn down during reconnect.
 *  - Retries once on a transient mic failure.
 */
function ReconnectAudioGuard() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!room) return;

    const wantsMic = { current: false };

    const resubscribeAllRemoteAudio = () => {
      room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.kind === Track.Kind.Audio && !pub.isSubscribed) {
            try {
              (pub as RemoteTrackPublication).setSubscribed(true);
              console.log("[stage-audio] Re-subscribed audio track", {
                from: p.identity,
                trackSid: pub.trackSid,
              });
            } catch (err) {
              console.warn("[stage-audio] Failed to re-subscribe", err);
            }
          }
        });
      });
    };

    const republishMicIfNeeded = async () => {
      const lp = room.localParticipant;
      if (!lp) return;
      if (!wantsMic.current) return;
      const hasLiveAudio = Array.from(lp.trackPublications.values()).some(
        (p) => p.kind === Track.Kind.Audio && p.track && !(p.track as any).isMuted,
      );
      if (hasLiveAudio) return;
      try {
        await lp.setMicrophoneEnabled(false);
        await lp.setMicrophoneEnabled(true);
        console.log("[stage-audio] Re-published mic after reconnect");
      } catch (err) {
        console.warn("[stage-audio] Mic republish failed, retrying", err);
        setTimeout(() => {
          lp.setMicrophoneEnabled(true).catch((e) =>
            console.error("[stage-audio] Mic republish retry failed", e),
          );
        }, 1500);
      }
    };

    const onReconnected = async () => {
      console.log("[stage-audio] Room reconnected — restoring audio");
      resubscribeAllRemoteAudio();
      await republishMicIfNeeded();
    };
    const onReconnecting = () => {
      console.log("[stage-audio] Room reconnecting…");
      const lp = room.localParticipant;
      if (lp) {
        wantsMic.current = Array.from(lp.trackPublications.values()).some(
          (p) => p.kind === Track.Kind.Audio,
        );
      }
    };
    const onParticipantConnected = () => resubscribeAllRemoteAudio();
    const onTrackPublished = (
      pub: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (pub.kind === Track.Kind.Audio && !pub.isSubscribed) {
        try {
          pub.setSubscribed(true);
          console.log("[stage-audio] Auto-subscribed newly published audio", {
            from: participant.identity,
          });
        } catch (err) {
          console.warn("[stage-audio] Auto-subscribe failed", err);
        }
      }
    };
    const onMediaFailure = (failure: unknown) => {
      console.warn("[stage-audio] Media device failure", failure);
      setTimeout(() => {
        room.localParticipant
          ?.setMicrophoneEnabled(true)
          .catch((e) => console.error("[stage-audio] Mic retry failed", e));
      }, 1000);
    };

    // Initial sweep in case we mounted after tracks were already published.
    resubscribeAllRemoteAudio();

    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.SignalConnected, onReconnected);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.TrackPublished, onTrackPublished as any);
    room.on(RoomEvent.MediaDevicesError, onMediaFailure as any);
    return () => {
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
    room.off(RoomEvent.SignalConnected, onReconnected);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.TrackPublished, onTrackPublished as any);
      room.off(RoomEvent.MediaDevicesError, onMediaFailure as any);
    };
  }, [room, localParticipant]);

  return null;
}

/** Compact diagnostics chip-row: mic, publish status, subscriptions, state. */
function StageDiagnostics() {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const [state, setState] = useState<ConnectionState>(
    room?.state ?? ConnectionState.Disconnected,
  );
  const [hasMicDevice, setHasMicDevice] = useState<boolean | null>(null);

  useEffect(() => {
    if (!room) return;
    const onState = (s: ConnectionState) => setState(s);
    room.on(RoomEvent.ConnectionStateChanged, onState);
    setState(room.state);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onState);
    };
  }, [room]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devs) => setHasMicDevice(devs.some((d) => d.kind === "audioinput")))
      .catch(() => setHasMicDevice(null));
  }, []);

  const publishedAudio = useMemo(() => {
    if (!localParticipant) return false;
    return Array.from(localParticipant.trackPublications.values()).some(
      (p) => p.kind === Track.Kind.Audio && !p.isMuted,
    );
  }, [localParticipant, isMicrophoneEnabled]);

  const subscribedAudio = useMemo(() => {
    let n = 0;
    remotes?.forEach((r) => {
      r.trackPublications.forEach((p) => {
        if (p.kind === Track.Kind.Audio && p.isSubscribed) n++;
      });
    });
    return n;
  }, [remotes]);

  const stateLabel = String(state);
  const stateColor =
    state === ConnectionState.Connected
      ? "text-emerald-300"
      : state === ConnectionState.Reconnecting
        ? "text-amber-300"
        : "text-red-300";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] text-white/70">
      <span className="flex items-center gap-1 font-semibold text-white/90">
        <Activity className="h-3 w-3" /> Audio diagnostics
      </span>
      <Chip ok={hasMicDevice !== false} label={hasMicDevice === false ? "No mic detected" : "Mic detected"} />
      <Chip ok={publishedAudio} label={publishedAudio ? "Publishing audio" : "Not publishing"} />
      <Chip ok={subscribedAudio > 0} neutral={subscribedAudio === 0 && remotes.length === 0} label={`Subscribed: ${subscribedAudio}`} />
      <span className={`flex items-center gap-1 ${stateColor}`}>
        <Volume2 className="h-3 w-3" /> {stateLabel}
      </span>
    </div>
  );
}

function Chip({ ok, label, neutral }: { ok: boolean; label: string; neutral?: boolean }) {
  const color = neutral ? "bg-white/30" : ok ? "bg-emerald-400" : "bg-red-400";
  return (
    <span className="flex items-center gap-1 rounded-md border border-white/5 bg-black/30 px-1.5 py-0.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
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
      <MicLevelMeter />
      <DeviceSelector compact />
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

/**
 * Local mic input level meter. LiveKit intentionally does NOT play your own
 * mic back to you (that would cause echo). This meter confirms the mic is
 * actually capturing audio.
 */
function MicLevelMeter() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!localParticipant || !isMicrophoneEnabled) {
      setLevel(0);
      return;
    }
    const pub = Array.from(localParticipant.trackPublications.values()).find(
      (p) => p.kind === Track.Kind.Audio,
    );
    const track = pub?.track as LocalAudioTrack | undefined;
    const mediaStreamTrack = track?.mediaStreamTrack;
    if (!mediaStreamTrack) return;

    let raf = 0;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    try {
      ctx = new AudioContext();
      const stream = new MediaStream([mediaStreamTrack]);
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyser) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 2.5));
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn("[stage-audio] Mic meter init failed", e);
    }
    return () => {
      cancelAnimationFrame(raf);
      try { source?.disconnect(); } catch {}
      try { analyser?.disconnect(); } catch {}
      try { ctx?.close(); } catch {}
    };
  }, [localParticipant, isMicrophoneEnabled]);

  const bars = 12;
  const lit = Math.round(level * bars);
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/30 px-2 py-2"
      title="Your mic input level — you won't hear yourself (would cause echo)"
    >
      {Array.from({ length: bars }).map((_, i) => {
        const active = i < lit;
        const color = i < 7 ? "bg-emerald-400" : i < 10 ? "bg-amber-400" : "bg-red-400";
        return (
          <span
            key={i}
            className={`h-3 w-1 rounded-sm ${active ? color : "bg-white/10"}`}
          />
        );
      })}
    </div>
  );
}