import { ArenaAudioClock } from "./audio-clock";
import {
  SLOT_SECONDS,
  buildSlotSchedule,
  rescheduleFrom,
  slotPositionAt,
  type ScheduledSlot,
  type SlotPosition,
  type SlotTrack,
} from "./slot-scheduler";
import {
  SLOT_ENVELOPE,
  applyEnergyCurve,
  applyMidSlotEnvelope,
  applySlotEnvelope,
} from "./crossfade-engine";

/**
 * ArenaSlotEngine — deterministic 60-second slot playback controller.
 *
 * Everything audible is PRE-SCHEDULED against the AudioContext clock the
 * moment start() runs: one AudioBufferSourceNode + GainNode per slot, with
 * source.start()/stop() and the whole gain envelope stamped in advance.
 * There are no play/pause transitions and no timers in the audio path. The
 * single setInterval below never touches audio — it only derives the current
 * SlotPosition from the clock to fire UI callbacks (slot change, voting
 * lock), and the values it reports are computed FROM the shared timeline,
 * not accumulated.
 *
 * Late joiners call start() mid-battle and get source.start(now, offset)
 * into the active slot, so every client converges on the same timeline.
 */

export type SlotEngineOptions = {
  slotSeconds?: number;
  /** 0 disables crossfade (strict slots). 2–3 enables DJ-style blending. */
  crossfadeSec?: number;
  /** Optional intro/full/hype envelope instead of the flat spec envelope. */
  energyCurve?: boolean;
};

export type SlotEngineEvents = {
  onSlotChange?: (position: SlotPosition) => void;
  onEnded?: () => void;
};

type SlotNodes = {
  index: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
};

const UI_TICK_MS = 250;

export class ArenaSlotEngine {
  readonly masterGain: GainNode;
  private schedule: ScheduledSlot[] = [];
  private nodes: SlotNodes[] = [];
  private uiTimer: number | null = null;
  private lastIndex: number | null = null;
  private readonly slotSeconds: number;
  private readonly crossfadeSec: number;
  private readonly energyCurve: boolean;

  constructor(
    private readonly ctx: AudioContext,
    private readonly clock: ArenaAudioClock,
    opts: SlotEngineOptions = {},
    private readonly events: SlotEngineEvents = {},
  ) {
    this.slotSeconds = opts.slotSeconds ?? SLOT_SECONDS;
    this.crossfadeSec = Math.max(0, opts.crossfadeSec ?? 0);
    this.energyCurve = opts.energyCurve ?? false;
    this.masterGain = ctx.createGain();
    // Headroom so the optional energy-curve hype lift (1.15) cannot clip.
    this.masterGain.gain.value = 0.85;
    this.masterGain.connect(ctx.destination);
  }

  get currentSchedule(): ScheduledSlot[] {
    return this.schedule;
  }

  position(): SlotPosition {
    return slotPositionAt(this.schedule, this.clock.serverNowMs());
  }

  /**
   * Schedule the whole queue against the shared epoch. Buffers must be fully
   * preloaded (preload-engine) — a missing buffer yields a silent slot, never
   * a shifted timeline.
   */
  start(queue: SlotTrack[], buffers: Map<string, AudioBuffer>, epochStartMs: number): void {
    this.stop();
    this.schedule = buildSlotSchedule(queue, epochStartMs, this.slotSeconds);
    this.scheduleAll(buffers);
    this.startUiTicker();
  }

  /** Vote-driven early transition: end the active slot and pull the rest forward. */
  endCurrentSlotEarly(buffers: Map<string, AudioBuffer>, leadInMs = 200): void {
    const pos = this.position();
    if (!pos.slot) return;
    const boundary = this.clock.serverNowMs() + leadInMs;
    this.schedule = rescheduleFrom(this.schedule, pos.index, boundary);
    // Re-stamp everything from the new boundary: tear down and re-schedule
    // remaining slots (history slots have already ended; their nodes are done).
    this.teardownNodes();
    this.scheduleAll(buffers);
  }

  stop(): void {
    this.teardownNodes();
    if (this.uiTimer !== null) {
      window.clearInterval(this.uiTimer);
      this.uiTimer = null;
    }
    this.schedule = [];
    this.lastIndex = null;
  }

  private scheduleAll(buffers: Map<string, AudioBuffer>): void {
    const nowMs = this.clock.serverNowMs();
    for (const slot of this.schedule) {
      if (slot.endsAtMs <= nowMs) continue; // already in the past
      const buffer = buffers.get(slot.trackId);
      if (!buffer) continue; // failed preload -> silent slot, timeline intact

      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(this.masterGain);

      const slotDurSec = (slot.endsAtMs - slot.startsAtMs) / 1000;
      const startCtx = this.clock.ctxTimeForServerMs(slot.startsAtMs);
      const endCtx = this.clock.ctxTimeForServerMs(slot.endsAtMs);

      if (slot.startsAtMs <= nowMs) {
        // Late join: enter the active slot at the correct offset.
        const offsetSec = Math.min((nowMs - slot.startsAtMs) / 1000, buffer.duration);
        const nowCtx = this.ctx.currentTime;
        source.start(nowCtx, offsetSec);
        applyMidSlotEnvelope(gain.gain, nowCtx, endCtx);
      } else {
        source.start(startCtx);
        if (this.energyCurve) {
          applyEnergyCurve(gain.gain, startCtx, slotDurSec);
        } else if (this.crossfadeSec > 0) {
          // DJ mode: this slot's head fade-in IS the incoming half of the
          // boundary blend (previous slot's tail rides over it, below).
          gain.gain.setValueAtTime(0, startCtx);
          gain.gain.linearRampToValueAtTime(1, startCtx + Math.min(this.crossfadeSec, slotDurSec / 2));
        } else {
          applySlotEnvelope(gain.gain, startCtx, slotDurSec, SLOT_ENVELOPE);
        }
      }

      if (this.crossfadeSec > 0) {
        const next = this.schedule.find((s) => s.index === slot.index + 1);
        const hasNext = !!(next && buffers.get(next.trackId));
        if (hasNext && slot.startsAtMs > nowMs) {
          // Outgoing half of the boundary blend: ride past the slot end while
          // fading to 0. Slot windows (and voting locks) are untouched.
          gain.gain.setValueAtTime(1, endCtx);
          gain.gain.linearRampToValueAtTime(0, endCtx + this.crossfadeSec);
          source.stop(endCtx + this.crossfadeSec);
        } else {
          gain.gain.linearRampToValueAtTime(0, endCtx);
          source.stop(endCtx + 0.05);
        }
      } else {
        source.stop(endCtx + 0.05);
      }

      this.nodes.push({ index: slot.index, source, gain });
    }
  }

  private teardownNodes(): void {
    for (const n of this.nodes) {
      try {
        n.gain.gain.cancelScheduledValues?.(0);
        n.source.stop();
      } catch {
        /* already stopped / never started */
      }
      try {
        n.source.disconnect();
        n.gain.disconnect();
      } catch {
        /* detached */
      }
    }
    this.nodes = [];
  }

  private startUiTicker(): void {
    if (typeof window === "undefined") return;
    this.uiTimer = window.setInterval(() => {
      const pos = this.position();
      if (pos.index !== this.lastIndex) {
        this.lastIndex = pos.index;
        this.events.onSlotChange?.(pos);
      }
      if (pos.ended) {
        this.events.onEnded?.();
        if (this.uiTimer !== null) {
          window.clearInterval(this.uiTimer);
          this.uiTimer = null;
        }
      }
    }, UI_TICK_MS);
  }
}
