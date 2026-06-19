import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Radio, UserPlus,
  Activity, CircleDot, Users, Volume2, VolumeX, Users2, SlidersHorizontal,
  X, Wifi, ShieldAlert, MoreVertical, Headphones, ShieldCheck, UserMinus, MessageSquare,
} from "lucide-react";
import { useMediaEngine } from "@/lib/media-engine/MediaEngineContext";
import { friendlyMediaError } from "@/lib/media-engine/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StagesAndBroadcasts } from "@/components/studio/StagesAndBroadcasts";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";
const PINK = "#ec4899";

/**
 * Live Production Dashboard.
 *
 * Single page. One MediaEngine. Stage and Broadcast are independent source
 * toggles. Toggling them never reinitializes devices, never restarts WebRTC,
 * never resets the mixer, and never interrupts active streams.
 */
export function LiveProductionDashboard({
  participants = [],
  onInvite,
  onEndBroadcast,
  onPromoteParticipant,
  onRemoveParticipant,
  onMessageParticipant,
}: {
  participants?: Array<{ id: string; name: string; avatar?: string | null }>;
  onInvite?: () => void;
  onEndBroadcast?: () => void;
  onPromoteParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onMessageParticipant?: (id: string) => void;
}) {
  const { engine, state } = useMediaEngine();

  // Auto-init: warm up the audio context on mount so meters animate.
  useEffect(() => { engine.ensureAudio(); }, [engine]);

  return (
    <div className="flex flex-col gap-4">
      {/* Live status indicators (always visible) */}
      <LiveStatusBar />

      {/* Friendly error banners */}
      <ErrorBanners />

      {/* Top toggle bar */}
      <ToggleHeader
        stage={state.stageEnabled}
        broadcast={state.broadcastEnabled}
        muted={state.masterMuted}
        camera={state.cameraEnabled}
        onStage={async (v) => {
          if (v && !state.hasMic) {
            try { await engine.acquireMic(); } catch (e) { notifyMediaError(e, "mic"); return; }
          }
          engine.setStageEnabled(v);
        }}
        onBroadcast={async (v) => {
          if (v && !state.hasCamera) {
            try { await engine.acquireCamera(); } catch (e) { notifyMediaError(e, "camera"); return; }
          }
          engine.setBroadcastEnabled(v);
        }}
        onMuteAll={() => engine.setMasterMuted(!state.masterMuted)}
        onCamera={async () => {
          if (!state.hasCamera) {
            try { await engine.acquireCamera(); } catch (e) { notifyMediaError(e, "camera"); return; }
          }
          engine.setCameraEnabled(!state.cameraEnabled);
        }}
        onEnd={() => {
          engine.setBroadcastEnabled(false);
          engine.setStageEnabled(false);
          onEndBroadcast?.();
        }}
      />

      {/* Source toggle panel — single source of truth for inputs/outputs */}
      <SourceTogglePanel />

      {/* Main two-panel layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        <StagePanel
          participants={participants}
          onInvite={onInvite}
          onPromoteParticipant={onPromoteParticipant}
          onRemoveParticipant={onRemoveParticipant}
          onMessageParticipant={onMessageParticipant}
        />
        <BroadcastPanel />
      </div>

      {/* Stage Rooms and Broadcasts — independent entities (separate database records) */}
      <StagesAndBroadcasts />

    </div>
  );
}

/* ---------------- Toggle header ---------------- */

function ToggleHeader({
  stage, broadcast, muted, camera,
  onStage, onBroadcast, onMuteAll, onCamera, onEnd,
}: {
  stage: boolean; broadcast: boolean; muted: boolean; camera: boolean;
  onStage: (v: boolean) => void; onBroadcast: (v: boolean) => void;
  onMuteAll: () => void; onCamera: () => void; onEnd: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/5 bg-[#0d0d18] p-4 md:grid-cols-[1fr_auto]">
      <div className="flex flex-wrap items-center gap-4">
        <ToggleChip label="STAGE MODE" on={stage} onChange={onStage} accent={PURPLE} />
        <span className="hidden h-8 w-px bg-white/10 md:block" />
        <ToggleChip label="BROADCAST MODE" on={broadcast} onChange={onBroadcast} accent={BLUE} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-2 text-[10px] font-bold tracking-widest text-white/50">QUICK CONTROLS</span>
        <QuickBtn icon={muted ? VolumeX : Volume2} label={muted ? "Unmute All" : "Mute All"} onClick={onMuteAll} active={muted} />
        <QuickBtn icon={camera ? Video : VideoOff} label="Camera" onClick={onCamera} active={!camera} />
        <button
          onClick={onEnd}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
        >
          <Radio className="h-3.5 w-3.5" /> End Broadcast
        </button>
      </div>
    </div>
  );
}

function ToggleChip({ label, on, onChange, accent }: { label: string; on: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold tracking-widest text-white/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          "relative inline-flex h-7 w-16 items-center rounded-full border border-white/10 transition",
          on ? "" : "bg-white/5",
        )}
        style={on ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)` } : undefined}
      >
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-white text-[9px] font-bold text-black shadow transition-all",
            on ? "left-9 px-2 py-0.5" : "left-1 px-2 py-0.5",
          )}
        >
          {on ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}

function QuickBtn({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/5",
        active ? "bg-white/10 text-white" : "text-white/80",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

/* ---------------- Stage panel ---------------- */

/* ---------------- Source toggle panel ---------------- */

function SourceTogglePanel() {
  const { engine, state } = useMediaEngine();
  const participantSources = state.sources.filter((s) => s.kind === "participant");
  const anyParticipantOn = participantSources.some((p) => p.enabled);
  const allParticipantsOn = participantSources.length > 0 && participantSources.every((p) => p.enabled);

  const handleMic = async () => {
    if (!state.hasMic) {
      try { await engine.acquireMic(); } catch (e) { notifyMediaError(e, "mic"); return; }
    }
    engine.setMicEnabled(!state.micEnabled);
  };

  const handleParticipants = () => {
    if (participantSources.length === 0) {
      toast.info("No participant mics connected yet");
      return;
    }
    const target = !allParticipantsOn;
    participantSources.forEach((p) => engine.setParticipantEnabled(p.id, target));
  };

  const handleCamera = async () => {
    if (!state.hasCamera) {
      try { await engine.acquireCamera(); } catch (e) { notifyMediaError(e, "camera"); return; }
    }
    engine.setCameraEnabled(!state.cameraEnabled);
  };

  const handleScreen = async () => {
    if (state.screenEnabled) { engine.releaseScreen(); return; }
    try { await engine.acquireScreen(); } catch (e) { notifyMediaError(e, "screen"); }
  };

  const handleStream = async () => {
    if (state.streaming) { engine.setBroadcastEnabled(false); return; }
    if (!state.hasCamera) {
      try { await engine.acquireCamera(); } catch (e) { notifyMediaError(e, "camera"); return; }
    }
    engine.setBroadcastEnabled(true);
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/70">
          <SlidersHorizontal className="h-3.5 w-3.5" /> SOURCE TOGGLES
        </h3>
        <span className="text-[10px] font-semibold text-white/40">
          Inputs → Mixer → Outputs
        </span>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SourceToggleCard
          label="Mic"
          sub={state.hasMic ? "Connected" : "Tap to enable"}
          on={state.micEnabled}
          accent={PURPLE}
          icon={state.micEnabled ? Mic : MicOff}
          onClick={handleMic}
        />
        <SourceToggleCard
          label="Participant Mics"
          sub={
            participantSources.length === 0
              ? "None connected"
              : `${participantSources.filter((p) => p.enabled).length}/${participantSources.length} live`
          }
          on={anyParticipantOn}
          partial={anyParticipantOn && !allParticipantsOn}
          accent={PINK}
          icon={Users2}
          onClick={handleParticipants}
        />
        <SourceToggleCard
          label="Camera"
          sub={state.hasCamera ? state.resolution : "Tap to enable"}
          on={state.cameraEnabled}
          accent={BLUE}
          icon={state.cameraEnabled ? Video : VideoOff}
          onClick={handleCamera}
        />
        <SourceToggleCard
          label="Screen Share"
          sub={state.screenEnabled ? "Sharing" : "Idle"}
          on={state.screenEnabled}
          accent="#22c55e"
          icon={MonitorUp}
          onClick={handleScreen}
        />
        <SourceToggleCard
          label="Stream"
          sub={state.streaming ? `${state.bitrateKbps} kbps` : "Ready"}
          on={state.streaming}
          accent="#ef4444"
          icon={Radio}
          onClick={handleStream}
        />
      </div>
    </section>
  );
}

function SourceToggleCard({
  label, sub, on, partial, accent, icon: Icon, onClick,
}: {
  label: string;
  sub: string;
  on: boolean;
  partial?: boolean;
  accent: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label} ${on ? "on" : "off"}`}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border p-3 text-left transition",
        on ? "border-white/15 bg-white/[0.04]" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition"
        style={{
          background: on ? `linear-gradient(135deg, ${accent}, ${accent}99)` : "rgba(255,255,255,0.05)",
          boxShadow: on ? `0 0 16px ${accent}55` : undefined,
        }}
      >
        <Icon className={cn("h-4 w-4", on ? "text-white" : "text-white/50")} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-semibold text-white">{label}</span>
          <StatusPill on={on} partial={partial} accent={accent} />
        </div>
        <div className="mt-0.5 truncate text-[10px] text-white/50">{sub}</div>
      </div>
    </button>
  );
}

function StatusPill({ on, partial, accent }: { on: boolean; partial?: boolean; accent: string }) {
  const label = partial ? "PARTIAL" : on ? "ON" : "OFF";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-widest",
        on ? "text-white" : "bg-white/10 text-white/50",
      )}
      style={on ? { background: `${accent}33`, color: accent } : undefined}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", on ? "animate-pulse" : "")}
        style={{ background: on ? accent : "rgba(255,255,255,0.3)" }}
      />
      {label}
    </span>
  );
}

/* ---------------- Stage panel (continued) ---------------- */

function StagePanel({
  participants, onInvite, onPromoteParticipant, onRemoveParticipant, onMessageParticipant,
}: {
  participants: Array<{ id: string; name: string; avatar?: string | null }>;
  onInvite?: () => void;
  onPromoteParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onMessageParticipant?: (id: string) => void;
}) {
  const { engine, state } = useMediaEngine();
  const mic = state.sources.find((s) => s.id === "mic");

  return (
    <section className="flex flex-col rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest" style={{ color: PURPLE }}>
          <Users className="h-4 w-4" /> STAGE (AUDIO)
        </h2>
        <span className="text-[10px] font-semibold text-white/40">{state.stageEnabled ? "Live" : "Idle"}</span>
      </header>

      <div className="mb-2 text-[11px] font-semibold text-white/60">Microphone</div>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <button
          onClick={async () => {
            if (!state.hasMic) { try { await engine.acquireMic(); } catch { toast.error("Mic denied"); return; } }
            engine.setMicEnabled(!state.micEnabled);
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: state.micEnabled ? `linear-gradient(135deg, ${PURPLE}, ${BLUE})` : "rgba(255,255,255,0.06)" }}
          aria-label={state.micEnabled ? "Mute mic" : "Unmute mic"}
        >
          {state.micEnabled ? <Mic className="h-4 w-4 text-white" /> : <MicOff className="h-4 w-4 text-white/60" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-xs font-semibold text-white">Mic Input</div>
          <LevelMeter level={state.micLevel} active={!!mic?.enabled} />
        </div>
        <span className={cn("text-[11px] font-semibold", state.micLevel > 0.05 ? "text-emerald-400" : "text-white/40")}>
          {state.hasMic ? (state.micLevel > 0.05 ? "Good" : "Quiet") : "Off"}
        </span>
      </div>

      <div className="mb-2 text-[11px] font-semibold text-white/60">Participants ({participants.length})</div>
      <div className="flex-1 space-y-2">
        {participants.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-[11px] text-white/40">
            No participants yet — invite a guest.
          </div>
        )}
        {participants.map((p) => (
          <ParticipantRow
            key={p.id}
            id={p.id}
            name={p.name}
            avatar={p.avatar}
            onPromote={onPromoteParticipant}
            onRemove={onRemoveParticipant}
            onMessage={onMessageParticipant}
          />
        ))}
      </div>

      <button
        onClick={onInvite}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-xs font-semibold text-white/80 transition hover:bg-white/5"
      >
        <UserPlus className="h-4 w-4" /> Invite Participant
      </button>
    </section>
  );
}

function ParticipantRow({
  id, name, avatar, onPromote, onRemove, onMessage,
}: {
  id: string;
  name: string;
  avatar?: string | null;
  onPromote?: (id: string) => void;
  onRemove?: (id: string) => void;
  onMessage?: (id: string) => void;
}) {
  const { engine, state } = useMediaEngine();
  const src = state.sources.find((s) => s.id === id);
  const enabled = src ? src.enabled : true;
  const [open, setOpen] = useState(false);
  const [gain, setGain] = useState(1);
  const [soloed, setSoloed] = useState(false);

  const handleSolo = () => {
    if (soloed) {
      engine.unsoloAll();
      setSoloed(false);
    } else {
      engine.soloParticipant(id);
      setSoloed(true);
    }
  };

  const handlePromote = () => {
    if (onPromote) onPromote(id);
    else toast.info(`${name} promoted to co-host`);
  };

  const handleRemove = () => {
    if (onRemove) onRemove(id);
    else toast.success(`${name} removed from stage`);
    engine.removeSource(id);
  };

  const handleMessage = () => {
    if (onMessage) onMessage(id);
    else toast.info(`Open DM with ${name}`);
  };

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-3 p-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}>
          {avatar ? <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" /> : name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-white">{name}</span>
            {soloed && (
              <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">Solo</span>
            )}
          </div>
          <LevelMeter level={enabled ? Math.min(1, 0.45 * gain + Math.random() * 0.1) : 0} active={enabled} />
        </div>
        <button
          onClick={() => engine.setParticipantEnabled(id, !enabled)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
            enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/50",
          )}
          aria-label={enabled ? "Mute participant" : "Unmute participant"}
        >
          {enabled ? "On" : "Off"}
        </button>
        <button
          onClick={() => setOpen((v: boolean) => !v)}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md transition",
            open ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
          )}
          aria-label="Participant tools"
          aria-expanded={open}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 p-3 pt-2">
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-white/50">
              <span className="flex items-center gap-1"><Volume2 className="h-3 w-3" /> Volume</span>
              <span className="text-white/70">{Math.round(gain * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={2} step={0.05} value={gain}
              onChange={(e) => { const v = Number(e.target.value); setGain(v); engine.setParticipantGain(id, v); }}
              className="w-full accent-white"
              aria-label="Participant volume"
            />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <ToolBtn icon={Headphones} label={soloed ? "Unsolo" : "Solo"} active={soloed} onClick={handleSolo} />
            <ToolBtn icon={MessageSquare} label="DM" onClick={handleMessage} />
            <ToolBtn icon={ShieldCheck} label="Promote" onClick={handlePromote} accent="emerald" />
            <ToolBtn icon={UserMinus} label="Remove" onClick={handleRemove} accent="red" />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  icon: Icon, label, onClick, active, accent,
}: {
  icon: any; label: string; onClick?: () => void; active?: boolean;
  accent?: "emerald" | "red";
}) {
  const tone =
    accent === "emerald" ? "hover:bg-emerald-500/15 hover:text-emerald-300"
    : accent === "red"   ? "hover:bg-red-500/15 hover:text-red-300"
    : "hover:bg-white/10 hover:text-white";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-md border border-white/5 px-2 py-1.5 text-[10px] font-semibold transition",
        active ? "bg-white/15 text-white" : "bg-white/[0.02] text-white/70",
        tone,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function LevelMeter({ level, active }: { level: number; active: boolean }) {
  const bars = 24;
  const lit = Math.min(bars, Math.round(level * bars * 2));
  return (
    <div className="flex h-2 items-center gap-[2px]">
      {Array.from({ length: bars }).map((_, i) => {
        const on = active && i < lit;
        const color = i < bars * 0.6 ? PURPLE : i < bars * 0.85 ? "#22c55e" : "#ef4444";
        return (
          <span
            key={i}
            className="block h-full w-[3px] rounded-sm transition-opacity"
            style={{ background: on ? color : "rgba(255,255,255,0.08)" }}
          />
        );
      })}
    </div>
  );
}

/* ---------------- Broadcast panel ---------------- */

function BroadcastPanel() {
  const { engine, state } = useMediaEngine();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Bind whichever video stream is active (screen > camera).
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const stream = engine.getScreenStream() ?? engine.getCameraStream();
    if (stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.muted = true;
      el.play().catch(() => {});
    }
    if (!stream && el.srcObject) {
      el.srcObject = null;
    }
  }, [engine, state.cameraEnabled, state.screenEnabled, state.hasCamera, state.hasScreen]);

  return (
    <section className="flex flex-col rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest" style={{ color: BLUE }}>
          <Video className="h-4 w-4" /> BROADCAST (VIDEO)
        </h2>
        <button
          onClick={async () => {
            if (state.screenEnabled) { engine.releaseScreen(); return; }
            try { await engine.acquireScreen(); } catch { toast.error("Screen share denied"); }
          }}
          className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/5"
        >
          <MonitorUp className="h-3 w-3" /> {state.screenEnabled ? "Stop Share" : "Share Screen"}
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-2 text-[11px] font-semibold text-white/60">Program Preview</div>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline />
            {!(state.hasCamera || state.hasScreen) && (
              <div className="absolute inset-0 grid place-items-center text-[11px] text-white/40">
                Enable Broadcast Mode to start camera
              </div>
            )}
            {state.broadcastEnabled && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
              </span>
            )}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] text-white/80">
              <span className="rounded bg-black/60 px-2 py-0.5 backdrop-blur">{state.resolution}</span>
              <span className="rounded bg-black/60 px-2 py-0.5 backdrop-blur">{state.fps} fps</span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold text-white/60">Stream Output</div>
          <OutputSettingsPanel />
          <button
            onClick={async () => {
              if (state.streaming) { engine.setBroadcastEnabled(false); return; }
              if (!state.hasCamera) {
                try { await engine.acquireCamera(); } catch (e) { notifyMediaError(e, "camera"); return; }
              }
              engine.setBroadcastEnabled(true);
            }}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition",
              state.streaming ? "bg-red-600 hover:bg-red-500" : "",
            )}
            style={state.streaming ? undefined : { background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})` }}
          >
            <Radio className="h-3.5 w-3.5" /> {state.streaming ? "Stream ON — Stop" : "Stream OFF — Start"}
          </button>
        </div>
      </div>
    </section>
  );
}

function StreamRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/50">{label}</dt>
      <dd className={cn("font-semibold text-white", valueClass)}>{value}</dd>
    </div>
  );
}

function OutputSettingsPanel() {
  const { engine, state } = useMediaEngine();
  const o = state.output;
  return (
    <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Protocol</span>
        <div className="flex gap-1">
          {(["rtmp", "srt", "webrtc"] as const).map((p) => (
            <button
              key={p}
              onClick={() => engine.setOutputSettings({ protocol: p })}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition",
                o.protocol === p ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/10",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
          {o.protocol === "webrtc" ? "WHIP Endpoint" : `${o.protocol.toUpperCase()} URL`}
        </span>
        <input
          type="text"
          value={o.url}
          onChange={(e) => engine.setOutputSettings({ url: e.target.value })}
          placeholder={
            o.protocol === "rtmp" ? "rtmp://live.example.com/app"
              : o.protocol === "srt" ? "srt://ingest.example.com:9999"
              : "https://whip.example.com/publish"
          }
          className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none focus:border-white/30"
        />
      </label>
      {o.protocol !== "webrtc" && (
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Stream Key</span>
          <input
            type="password"
            value={o.streamKey}
            onChange={(e) => engine.setOutputSettings({ streamKey: e.target.value })}
            placeholder="••••••••"
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none focus:border-white/30"
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Resolution</span>
          <select
            value={o.resolution}
            onChange={(e) => engine.setOutputSettings({ resolution: e.target.value as any })}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none focus:border-white/30"
          >
            <option value="1920x1080">1080p</option>
            <option value="1280x720">720p</option>
            <option value="854x480">480p</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">FPS</span>
          <select
            value={o.fps}
            onChange={(e) => engine.setOutputSettings({ fps: Number(e.target.value) as any })}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none focus:border-white/30"
          >
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-white/50">
          <span>Bitrate</span>
          <span className="text-white/70">{o.bitrateKbps} kbps</span>
        </span>
        <input
          type="range"
          min={500}
          max={12000}
          step={250}
          value={o.bitrateKbps}
          onChange={(e) => engine.setOutputSettings({ bitrateKbps: Number(e.target.value) })}
          className="mt-1 w-full accent-white"
        />
      </label>
      <dl className="mt-2 space-y-1 border-t border-white/5 pt-2 text-[11px]">
        <StreamRow
          label="Status"
          value={state.streaming ? "Live" : "Ready"}
          valueClass={state.streaming ? "text-emerald-400" : "text-white/60"}
        />
        <StreamRow label="Capture" value={state.resolution} />
      </dl>
    </div>
  );
}

/* ---------------- Live status + friendly errors ---------------- */

function notifyMediaError(e: unknown, source: "mic" | "camera" | "screen" | "stream") {
  const f = friendlyMediaError(e, source);
  toast.error(f.title, { description: f.hint });
}

type Tone = "ok" | "warn" | "err" | "idle";
const TONE: Record<Tone, { dot: string; text: string; bg: string; ring: string; label: string }> = {
  ok:   { dot: "#22c55e", text: "text-emerald-300", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", label: "OK" },
  warn: { dot: "#f59e0b", text: "text-amber-300",   bg: "bg-amber-500/10",   ring: "ring-amber-500/30",   label: "Check" },
  err:  { dot: "#ef4444", text: "text-red-300",     bg: "bg-red-500/10",     ring: "ring-red-500/30",     label: "Error" },
  idle: { dot: "#64748b", text: "text-white/50",    bg: "bg-white/[0.03]",   ring: "ring-white/10",       label: "Idle" },
};

function LiveStatusBar() {
  const { state } = useMediaEngine();

  const hasMicErr = state.errors.some((e) => e.source === "mic");
  const hasCamErr = state.errors.some((e) => e.source === "camera");
  const hasScrErr = state.errors.some((e) => e.source === "screen");

  const micTone: Tone = hasMicErr ? "err" : state.micEnabled && state.hasMic ? "ok" : state.hasMic ? "warn" : "idle";
  const camTone: Tone = hasCamErr ? "err" : state.cameraEnabled && state.hasCamera ? "ok" : state.hasCamera ? "warn" : "idle";
  const scrTone: Tone = hasScrErr ? "err" : state.screenEnabled ? "ok" : "idle";

  const stageTone: Tone = !state.stageEnabled
    ? "idle"
    : state.stagePublishing
      ? "ok"
      : "warn"; // stage on but mic not publishing

  const broadcastTone: Tone = !state.broadcastEnabled
    ? "idle"
    : state.broadcastPublishing
      ? "ok"
      : "warn"; // broadcast on but no video source

  const encoderTone: Tone = mapHealth(state.encoderHealth);
  const outputTone: Tone = mapHealth(state.outputHealth);

  const messages: Record<Tone, string> = {
    ok: "Live",
    warn: "Needs source",
    err: "Permission error",
    idle: "Idle",
  };

  return (
    <section
      aria-label="Live status"
      className="grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-[#0d0d18] p-3 sm:grid-cols-3 lg:grid-cols-7"
    >
      <StatusDot icon={Mic} label="Mic" tone={micTone} note={hasMicErr ? "Permission needed" : state.hasMic ? (state.micEnabled ? "Capturing" : "Muted") : "Not started"} />
      <StatusDot icon={Video} label="Camera" tone={camTone} note={hasCamErr ? "Permission needed" : state.hasCamera ? (state.cameraEnabled ? "Capturing" : "Paused") : "Not started"} />
      <StatusDot icon={MonitorUp} label="Screen" tone={scrTone} note={hasScrErr ? "Permission needed" : state.screenEnabled ? "Sharing" : "Not sharing"} />
      <StatusDot icon={Users} label="Stage Publish" tone={stageTone} note={state.stageEnabled ? (state.stagePublishing ? "Publishing audio" : "Enable mic to publish") : "Off"} />
      <StatusDot icon={Radio} label="Broadcast Publish" tone={broadcastTone} note={state.broadcastEnabled ? (state.broadcastPublishing ? "Publishing video" : "Enable a video source") : "Off"} />
      <StatusDot icon={Activity} label="Encoder" tone={encoderTone} note={messages[encoderTone]} />
      <StatusDot icon={Wifi} label="Output" tone={outputTone} note={state.streaming ? `${state.bitrateKbps} kbps` : messages[outputTone]} />
    </section>
  );
}

function mapHealth(h: "ok" | "warning" | "error" | "idle"): Tone {
  return h === "ok" ? "ok" : h === "warning" ? "warn" : h === "error" ? "err" : "idle";
}

function StatusDot({ icon: Icon, label, tone, note }: { icon: any; label: string; tone: Tone; note: string }) {
  const t = TONE[tone];
  return (
    <div
      className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1", t.bg, t.ring)}
      title={`${label}: ${note}`}
    >
      <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.04]">
        <Icon className={cn("h-3.5 w-3.5", t.text)} />
        <span
          className={cn("absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[#0d0d18]", tone === "ok" && "animate-pulse")}
          style={{ background: t.dot }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11px] font-semibold text-white">{label}</span>
        </div>
        <div className={cn("truncate text-[10px]", t.text)}>{note}</div>
      </div>
    </div>
  );
}

function ErrorBanners() {
  const { engine, state } = useMediaEngine();
  if (!state.errors.length) return null;
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      {state.errors.map((err) => (
        <div
          key={err.id}
          className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12px] text-red-100"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-red-200">{err.title}</div>
            <div className="mt-0.5 text-red-100/80">{err.hint}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-red-200/50">
              Source: {err.source} · {err.code}
            </div>
          </div>
          <button
            onClick={() => engine.dismissError(err.id)}
            className="rounded-md p-1 text-red-200/70 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- How it works ---------------- */

export function HowItWorks() {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <h3 className="mb-4 text-center text-xs font-bold tracking-widest text-white/70">HOW IT WORKS</h3>
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <Block tone={PURPLE} title="STAGE LAYER (INPUT)">
          <Bullet>Microphone (getUserMedia / WebRTC)</Bullet>
          <Bullet>Participants (optional WebRTC)</Bullet>
          <Bullet>Audience mics</Bullet>
        </Block>
        <Arrow label="Audio Input" />
        <Block tone="#f59e0b" title="AUDIO MIXER (ROUTING)">
          <Bullet>Mix multiple inputs</Bullet>
          <Bullet>Noise suppression</Bullet>
          <Bullet>Echo cancellation</Bullet>
          <Bullet>Gain control → Program Mix</Bullet>
        </Block>
        <Arrow label="Mixed Audio" />
        <Block tone={BLUE} title="BROADCAST LAYER (OUTPUT)">
          <Bullet>Video source (camera / screen / media)</Bullet>
          <Bullet>Encoder (video + audio)</Bullet>
          <Bullet>Stream output (RTMP / SRT / WebRTC)</Bullet>
        </Block>
      </div>
    </section>
  );
}

function Block({ tone, title, children }: { tone: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${tone}55`, background: `${tone}10` }}>
      <div className="mb-2 text-[11px] font-bold tracking-widest" style={{ color: tone }}>{title}</div>
      <ul className="space-y-1 text-[11px] text-white/75">{children}</ul>
    </div>
  );
}
function Bullet({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><CircleDot className="mt-0.5 h-3 w-3 shrink-0 text-white/40" /><span>{children}</span></li>;
}
function Arrow({ label }: { label: string }) {
  return (
    <div className="hidden flex-col items-center justify-center px-2 text-[10px] text-white/40 md:flex">
      <span>→</span>
      <span className="mt-1 whitespace-nowrap">{label}</span>
    </div>
  );
}

/* ---------------- Key points ---------------- */

export function KeyPointsCard() {
  const { state } = useMediaEngine();
  const points = [
    "Stage is the input layer (mic / participants).",
    "Broadcast is the output layer (video stream).",
    "Audio Mixer connects them safely.",
    "Enable / disable Stage or Broadcast independently.",
    "No hard switching. No reinitializing mic or camera.",
  ];
  const modes = [
    { label: "Stage Only", s: state.stageEnabled && !state.broadcastEnabled },
    { label: "Broadcast Only", s: !state.stageEnabled && state.broadcastEnabled },
    { label: "Both Active", s: state.stageEnabled && state.broadcastEnabled },
    { label: "Idle", s: !state.stageEnabled && !state.broadcastEnabled },
  ];
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-widest text-emerald-400">
          <Activity className="h-3.5 w-3.5" /> KEY POINTS
        </div>
        <ul className="space-y-2 text-[11px] text-white/75">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <span className="mt-0.5 grid h-3.5 w-3.5 place-items-center rounded-sm bg-emerald-500/20 text-emerald-300 text-[10px]">✓</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
        <div className="mb-3 text-[11px] font-bold tracking-widest text-white/70">CURRENT STATE</div>
        <ul className="space-y-1.5 text-[11px]">
          {modes.map((m) => (
            <li key={m.label} className="flex items-center justify-between">
              <span className="text-white/70">{m.label}</span>
              <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold", m.s ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/40")}>
                {m.s ? "ACTIVE" : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}