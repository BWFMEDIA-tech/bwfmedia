/**
 * MediaEngine — a single, persistent media pipeline for the Live Studio.
 *
 * Architecture: Inputs → Mixer/Router → Encoder → Outputs.
 * Stage and Broadcast are independent source toggles over a shared engine.
 * Toggling never reinitializes devices, never rebuilds the AudioContext,
 * never disconnects the room, and never tears down the encoder.
 */

import { friendlyMediaError, type FriendlyMediaError } from "./errors";

export type SourceKind = "mic" | "participant" | "media";

export type EngineHealth = "ok" | "warning" | "error" | "idle";

export interface EngineError extends FriendlyMediaError {
  id: string;
  source: "mic" | "camera" | "screen" | "stream";
  at: number;
}

export interface MixerSource {
  id: string;
  label: string;
  kind: SourceKind;
  gain: GainNode;
  node: AudioNode;
  enabled: boolean;
  level: number; // 0..1 latest peak
}

export interface EngineState {
  stageEnabled: boolean;
  broadcastEnabled: boolean;
  cameraEnabled: boolean;
  screenEnabled: boolean;
  micEnabled: boolean;
  masterMuted: boolean;
  hasMic: boolean;
  hasCamera: boolean;
  hasScreen: boolean;
  sources: MixerSource[];
  micLevel: number;
  programLevel: number;
  streaming: boolean;
  bitrateKbps: number;
  resolution: string;
  fps: number;
  platform: string;
  errors: EngineError[];
  stagePublishing: boolean;
  broadcastPublishing: boolean;
  encoderHealth: EngineHealth;
  outputHealth: EngineHealth;
}

type Listener = (s: EngineState) => void;

export class MediaEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private cameraStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private sources = new Map<string, MixerSource>();
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private listeners = new Set<Listener>();
  private state: EngineState = {
    stageEnabled: false,
    broadcastEnabled: false,
    cameraEnabled: false,
    screenEnabled: false,
    micEnabled: false,
    masterMuted: false,
    hasMic: false,
    hasCamera: false,
    hasScreen: false,
    sources: [],
    micLevel: 0,
    programLevel: 0,
    streaming: false,
    bitrateKbps: 0,
    resolution: "—",
    fps: 0,
    platform: "BWF Network",
    errors: [],
    stagePublishing: false,
    broadcastPublishing: false,
    encoderHealth: "idle",
    outputHealth: "idle",
  };

  /** Initialize the audio graph once. Safe to call repeatedly. */
  ensureAudio(): AudioContext {
    if (this.audioCtx) return this.audioCtx;
    const Ctx: typeof AudioContext =
      (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) ||
      (AudioContext as any);
    const ctx = new Ctx();
    this.audioCtx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;
    this.destination = ctx.createMediaStreamDestination();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.destination);
    this.startMeter();
    return ctx;
  }

  private startMeter() {
    if (this.rafId != null) return;
    const buf = new Uint8Array(this.analyser!.fftSize);
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      // Per-source levels (cheap approximation via mic stream only)
      const next = { ...this.state, programLevel: peak };
      if (this.micEnabledInternal()) next.micLevel = peak;
      else next.micLevel = 0;
      this.state = next;
      this.emit();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private micEnabledInternal() {
    const mic = this.sources.get("mic");
    return !!mic && mic.enabled;
  }

  /** Idempotent: acquires the mic once and reuses the cached stream. */
  async acquireMic(): Promise<void> {
    if (this.micStream) {
      this.setMicEnabled(true);
      return;
    }
    const ctx = this.ensureAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.micStream = stream;
      const src = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain).connect(this.masterGain!);
      this.micSourceNode = src;
      this.sources.set("mic", {
        id: "mic",
        label: "Mic Input",
        kind: "mic",
        gain,
        node: src,
        enabled: true,
        level: 0,
      });
      this.patch({ hasMic: true, micEnabled: true });
      this.refreshSources();
    } catch (e: any) {
      this.pushError(e, "mic");
      throw e;
    }
  }

  setMicEnabled(on: boolean) {
    const mic = this.sources.get("mic");
    if (!mic) return;
    mic.enabled = on;
    mic.gain.gain.value = on ? 1 : 0;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => (t.enabled = on));
    }
    this.patch({ micEnabled: on });
    this.refreshSources();
  }

  setParticipantEnabled(id: string, on: boolean) {
    const p = this.sources.get(id);
    if (!p) return;
    p.enabled = on;
    p.gain.gain.value = on ? 1 : 0;
    this.refreshSources();
  }

  /** Add a remote participant audio stream into the mixer without touching the
   * pipeline. Returns an id to remove it later. */
  addParticipantStream(label: string, stream: MediaStream): string {
    const ctx = this.ensureAudio();
    const id = `p_${Math.random().toString(36).slice(2, 9)}`;
    const node = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    gain.gain.value = 1;
    node.connect(gain).connect(this.masterGain!);
    this.sources.set(id, { id, label, kind: "participant", gain, node, enabled: true, level: 0 });
    this.refreshSources();
    return id;
  }

  removeSource(id: string) {
    const s = this.sources.get(id);
    if (!s) return;
    try { s.gain.disconnect(); s.node.disconnect(); } catch {}
    this.sources.delete(id);
    this.refreshSources();
  }

  /** Idempotent camera acquisition. */
  async acquireCamera(): Promise<MediaStream> {
    if (this.cameraStream) {
      this.setCameraEnabled(true);
      return this.cameraStream;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      });
    } catch (e) {
      this.pushError(e, "camera");
      throw e;
    }
    this.cameraStream = stream;
    const settings = stream.getVideoTracks()[0]?.getSettings();
    this.patch({
      hasCamera: true,
      cameraEnabled: true,
      resolution: settings ? `${settings.width ?? "—"} x ${settings.height ?? "—"}` : "—",
      fps: settings?.frameRate ? Math.round(settings.frameRate) : 30,
    });
    return stream;
  }

  setCameraEnabled(on: boolean) {
    if (!this.cameraStream) return;
    this.cameraStream.getVideoTracks().forEach((t) => (t.enabled = on));
    this.patch({ cameraEnabled: on });
  }

  async acquireScreen(): Promise<MediaStream> {
    if (this.screenStream) {
      this.setScreenEnabled(true);
      return this.screenStream;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch (e) {
      this.pushError(e, "screen");
      throw e;
    }
    this.screenStream = stream;
    // If screen carries audio, route it through the mixer.
    const audio = stream.getAudioTracks()[0];
    if (audio) {
      const aStream = new MediaStream([audio]);
      this.addParticipantStream("Screen Audio", aStream);
    }
    // Auto-release when user stops sharing via browser UI
    stream.getVideoTracks()[0]?.addEventListener("ended", () => this.releaseScreen());
    this.patch({ hasScreen: true, screenEnabled: true });
    return stream;
  }

  setScreenEnabled(on: boolean) {
    if (!this.screenStream) return;
    this.screenStream.getVideoTracks().forEach((t) => (t.enabled = on));
    this.patch({ screenEnabled: on });
  }

  releaseScreen() {
    if (!this.screenStream) return;
    this.screenStream.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    this.patch({ hasScreen: false, screenEnabled: false });
  }

  /** STAGE toggle — only flips publish state for stage audio. Never rebuilds. */
  setStageEnabled(on: boolean) {
    this.patch({
      stageEnabled: on,
      stagePublishing: on && this.state.micEnabled && this.state.hasMic,
    });
    // Stage maps to mic publishing in our pipeline. Toggling Stage off keeps
    // the mic stream alive but mutes its outgoing track so re-enabling is
    // instant.
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => (t.enabled = on && this.state.micEnabled));
    }
  }

  /** BROADCAST toggle — only flips egress publish state. Never rebuilds. */
  setBroadcastEnabled(on: boolean) {
    const hasVideo = this.state.hasCamera || this.state.hasScreen;
    this.patch({
      broadcastEnabled: on,
      streaming: on,
      bitrateKbps: on ? 4500 : 0,
      broadcastPublishing: on && hasVideo,
      encoderHealth: on ? (hasVideo ? "ok" : "warning") : "idle",
      outputHealth: on ? (hasVideo ? "ok" : "warning") : "idle",
    });
    if (this.cameraStream) {
      this.cameraStream.getVideoTracks().forEach((t) => (t.enabled = on && this.state.cameraEnabled));
    }
  }

  setMasterMuted(on: boolean) {
    if (this.masterGain) this.masterGain.gain.value = on ? 0 : 1;
    this.patch({ masterMuted: on });
  }

  setPlatform(name: string) { this.patch({ platform: name }); }

  /** Convert a raw media error into a friendly EngineError and store it. */
  pushError(e: unknown, source: "mic" | "camera" | "screen" | "stream") {
    const f = friendlyMediaError(e, source);
    const entry: EngineError = {
      ...f,
      id: `${source}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source,
      at: Date.now(),
    };
    // Keep at most 5 most recent, dedup by title+source.
    const filtered = this.state.errors.filter(
      (x) => !(x.source === source && x.title === entry.title),
    );
    this.patch({ errors: [entry, ...filtered].slice(0, 5) });
  }

  dismissError(id: string) {
    this.patch({ errors: this.state.errors.filter((e) => e.id !== id) });
  }

  clearErrors() { this.patch({ errors: [] }); }

  getCameraStream(): MediaStream | null { return this.cameraStream; }
  getScreenStream(): MediaStream | null { return this.screenStream; }
  getProgramAudioStream(): MediaStream | null { return this.destination?.stream ?? null; }

  getState(): EngineState { return this.state; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => { this.listeners.delete(fn); };
  }

  /** Permanently dispose. Only on unmount of the entire studio session. */
  dispose() {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.sources.forEach((s) => { try { s.gain.disconnect(); s.node.disconnect(); } catch {} });
    this.sources.clear();
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.cameraStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.micStream = this.cameraStream = this.screenStream = null;
    try { this.audioCtx?.close(); } catch {}
    this.audioCtx = null;
    this.masterGain = this.destination = this.analyser = null;
  }

  private patch(partial: Partial<EngineState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private refreshSources() {
    this.state = { ...this.state, sources: Array.from(this.sources.values()) };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l(this.state));
  }
}