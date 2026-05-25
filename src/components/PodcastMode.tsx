import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Radio,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Pin,
  Power,
  Music,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { LiveQueueRow } from "@/lib/useLiveQueue";
import { cn } from "@/lib/utils";
import { usePodcastState } from "@/lib/usePodcastState";

const RED = "#ef2b2b";

export type LiveMode = "review" | "podcast";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: LiveMode;
  onChange: (m: LiveMode) => void;
}) {
  const Btn = ({
    value,
    icon,
    label,
  }: {
    value: LiveMode;
    icon: React.ReactNode;
    label: string;
  }) => {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        className={cn(
          "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-anton uppercase tracking-[0.2em] text-[11px] transition-all",
          active ? "text-bone" : "text-bone/60 hover:text-bone",
        )}
        style={{
          background: active ? RED : "transparent",
          boxShadow: active ? `0 0 18px ${RED}55` : undefined,
        }}
        aria-pressed={active}
      >
        {icon}
        {label}
      </button>
    );
  };
  return (
    <div
      className="inline-flex items-stretch border w-full sm:w-auto"
      style={{ borderColor: `${RED}55`, background: "rgba(0,0,0,0.4)" }}
      role="tablist"
      aria-label="Live mode"
    >
      <Btn value="review" icon={<Music className="w-3.5 h-3.5" />} label="Live Review" />
      <Btn value="podcast" icon={<Mic className="w-3.5 h-3.5" />} label="Live Podcast" />
    </div>
  );
}

function OnAirBadge({ status }: { status: "ON AIR" | "WAITING" | "UPCOMING" }) {
  const isLive = status === "ON AIR";
  return (
    <span
      className="inline-flex items-center gap-2 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] font-anton"
      style={{
        background: isLive ? RED : "rgba(255,255,255,0.08)",
        color: isLive ? "#fff" : "rgba(246,239,227,0.7)",
        boxShadow: isLive ? `0 0 18px ${RED}88` : undefined,
      }}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-white" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      )}
      {status}
    </span>
  );
}

function PodcastWaveform({ active }: { active: boolean }) {
  const bars = useMemo(() => Array.from({ length: 32 }, (_, i) => i), []);
  return (
    <div className="flex items-end gap-[3px] h-8" aria-hidden="true">
      {bars.map((i) => (
        <motion.span
          key={i}
          className="w-[3px] block"
          style={{ background: i % 3 === 0 ? RED : `${RED}aa` }}
          animate={
            active
              ? { height: [6, 10 + ((i * 7) % 18), 6] }
              : { height: 6 }
          }
          transition={{
            duration: 0.9 + (i % 5) * 0.12,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function PodcastStudio({ queue }: { queue: LiveQueueRow[] }) {
  // Shared realtime state — all viewers stay in sync via Supabase Realtime.
  const { state, update } = usePodcastState();
  const liveFromQueue = queue.find((r) => r.queue_status === "live") ?? null;
  const upcoming = queue.filter(
    (r) => r.queue_status === "next_up" || r.queue_status === "queued",
  );

  const pinnedId = state.pinned_id;
  const sessionLive = state.session_live;
  const cursor = state.cursor;

  const pinned = pinnedId ? queue.find((r) => r.id === pinnedId) ?? null : null;
  const onAir = pinned ?? liveFromQueue ?? upcoming[0] ?? null;
  const nextGuests = upcoming.filter((r) => r.id !== onAir?.id).slice(0, 6);

  // Audio playback for guest tracks (reuses uploaded_audio_url).
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const guestsWithAudio = queue.filter((r) => r.uploaded_audio_url);
  const [audioIdx, setAudioIdx] = useState(0);
  const currentAudio = guestsWithAudio[audioIdx] ?? null;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
    if (playing && currentAudio?.uploaded_audio_url) {
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing, muted, currentAudio?.uploaded_audio_url]);

  function playNextAudio() {
    if (guestsWithAudio.length === 0) return;
    setAudioIdx((i) => (i + 1) % guestsWithAudio.length);
    setPlaying(true);
  }

  function advanceSpeaker() {
    if (upcoming.length === 0) return;
    const nextCursor = (cursor + 1) % upcoming.length;
    const next = upcoming[nextCursor];
    void update({ cursor: nextCursor, pinned_id: next?.id ?? null });
  }

  const status: "ON AIR" | "WAITING" | "UPCOMING" = !sessionLive
    ? "WAITING"
    : onAir
      ? "ON AIR"
      : "UPCOMING";

  return (
    <section className="mb-10 lg:mb-14 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="block w-0.5 h-5" style={{ background: RED }} />
          <h2 className="font-anton text-xl uppercase tracking-wide text-bone flex items-center gap-2">
            <Radio className="w-4 h-4" style={{ color: RED }} />
            On Air Podcast Studio
          </h2>
        </div>
        <OnAirBadge status={status} />
      </div>

      {/* On Air panel */}
      <div
        className="relative border bg-black/50 p-4 md:p-5 overflow-hidden"
        style={{
          borderColor: status === "ON AIR" ? RED : `${RED}33`,
          boxShadow: status === "ON AIR" ? `0 0 32px ${RED}33` : undefined,
        }}
      >
        {status === "ON AIR" && (
          <motion.span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.25 }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: `radial-gradient(circle at 20% 50%, ${RED}33, transparent 60%)`,
            }}
          />
        )}
        <div className="relative flex items-center gap-4">
          <div
            className="shrink-0 w-16 h-16 grid place-items-center"
            style={{
              border: `1px solid ${RED}88`,
              background: `radial-gradient(circle, ${RED}55, transparent 70%)`,
            }}
          >
            <Mic className="w-7 h-7" style={{ color: RED }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: RED }}>
              Now Speaking
            </div>
            <div className="font-anton text-lg md:text-xl uppercase tracking-wide text-bone leading-tight mt-0.5 truncate">
              {onAir?.artist_name ?? "Waiting for next guest…"}
            </div>
            <div className="text-bone/60 text-xs truncate">
              {onAir?.song_title ? `"${onAir.song_title}"` : "Live podcast session active"}
            </div>
            <div className="mt-2">
              <PodcastWaveform active={status === "ON AIR" && playing} />
            </div>
          </div>
        </div>

        {/* Audio playback strip */}
        {currentAudio?.uploaded_audio_url && (
          <div className="relative mt-4 pt-4 border-t" style={{ borderColor: `${RED}22` }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[10px] uppercase tracking-[0.3em] text-bone/60">
                Guest Track:{" "}
                <span className="text-bone">{currentAudio.artist_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] font-anton text-bone"
                  style={{ background: RED }}
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {playing ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] font-anton text-bone/80 border"
                  style={{ borderColor: `${RED}55` }}
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button
                  type="button"
                  onClick={playNextAudio}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] font-anton text-bone/80 border"
                  style={{ borderColor: `${RED}55` }}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Next Guest Audio
                </button>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={currentAudio.uploaded_audio_url}
              onEnded={playNextAudio}
              className="hidden"
            />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        {/* Guest lineup */}
        <div className="border bg-black/40 p-4" style={{ borderColor: `${RED}33` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-anton uppercase tracking-wide text-bone text-sm flex items-center gap-2">
              <span className="block w-0.5 h-4" style={{ background: RED }} />
              Next Up Guests
            </h3>
            <span className="text-[10px] uppercase tracking-[0.25em] text-bone/50">
              {nextGuests.length} upcoming
            </span>
          </div>
          {nextGuests.length === 0 ? (
            <p className="text-bone/50 text-sm py-6 text-center">
              No guests in the lineup yet.
            </p>
          ) : (
            <ol className="divide-y" style={{ borderColor: `${RED}22` }}>
              {nextGuests.map((g, i) => {
                const isFeatured = g.tier !== "basic";
                return (
                  <li
                    key={g.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    style={{ borderColor: `${RED}22` }}
                  >
                    <span
                      className="w-7 h-7 grid place-items-center font-anton text-xs"
                      style={{ color: RED, border: `1px solid ${RED}55` }}
                    >
                      {i + 1}
                    </span>
                    <Link
                      to="/artist/$id"
                      params={{ id: g.id }}
                      className="flex-1 min-w-0 flex items-center gap-2 hover:underline"
                    >
                      <Mic className="w-3.5 h-3.5 text-bone/50 shrink-0" />
                      <span className="font-anton uppercase tracking-wide text-bone text-sm truncate">
                        {g.artist_name}
                      </span>
                      {isFeatured && (
                        <span
                          className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] font-anton"
                          style={{ background: `${RED}33`, color: RED }}
                        >
                          Featured Guest
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPinnedId(g.id)}
                      className="p-1.5 text-bone/60 hover:text-bone transition-colors"
                      title="Pin to On Air"
                      aria-label={`Pin ${g.artist_name} to On Air`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Host control panel */}
        <div
          className="border bg-black/60 p-4"
          style={{ borderColor: `${RED}55` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="block w-0.5 h-4" style={{ background: RED }} />
            <h3 className="font-anton uppercase tracking-wide text-bone text-sm">
              Host Control Panel
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <HostBtn
              icon={<Power className="w-3.5 h-3.5" />}
              label={sessionLive ? "Pause Session" : "Start Session"}
              onClick={() => void update({ session_live: !sessionLive })}
              primary={!sessionLive}
            />
            <HostBtn
              icon={<SkipForward className="w-3.5 h-3.5" />}
              label="Next Speaker"
              onClick={advanceSpeaker}
            />
            <HostBtn
              icon={muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              label={muted ? "Unmute Audio" : "Mute Audio"}
              onClick={() => setMuted((m) => !m)}
            />
            <HostBtn
              icon={<Pin className="w-3.5 h-3.5" />}
              label={pinnedId ? "Unpin Guest" : "Pin On Air"}
              onClick={() => void update({ pinned_id: pinnedId ? null : onAir?.id ?? null })}
            />
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-bone/40">
            Controls steer the live broadcast view only.
          </p>
        </div>
      </div>
    </section>
  );
}

function HostBtn({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 font-anton uppercase tracking-[0.18em] text-[10px] text-bone transition-all hover:brightness-110"
      style={{
        background: primary ? RED : "transparent",
        border: `1px solid ${primary ? RED : `${RED}55`}`,
        boxShadow: primary ? `0 0 14px ${RED}55` : undefined,
      }}
    >
      {icon}
      {label}
    </button>
  );
}