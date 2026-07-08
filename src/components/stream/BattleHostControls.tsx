import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Play, Square, Vote, Lock, CheckCircle2, SkipForward, X, StopCircle } from "lucide-react";
import {
  dispatchBattleEvent,
  getBattleArtistQueues,
  type BattleEventType,
} from "@/lib/battle-engine.functions";
import { cn } from "@/lib/utils";
import { SignedImg } from "@/components/ui/signed-img";

/**
 * Pure control surface for the battle host. Renders buttons only and emits
 * `dispatchBattleEvent` calls. Does NOT mutate state locally or compute any
 * battle logic — every decision is enforced by the Battle Engine.
 */
export function BattleHostControls({
  matchId,
  activeSide,
  votingStatus,
  currentRoundExists,
  matchStatus,
  currentRound,
  totalRounds,
  artistAName,
  artistBName,
  onAfterEmit,
}: {
  matchId: string;
  activeSide: "a" | "b" | null;
  votingStatus: "closed" | "open" | "finalized";
  currentRoundExists: boolean;
  matchStatus: string;
  currentRound: number;
  totalRounds: number;
  artistAName: string;
  artistBName: string;
  onAfterEmit?: () => void;
}) {
  const dispatchFn = useServerFn(dispatchBattleEvent);
  const queuesFn = useServerFn(getBattleArtistQueues);
  const [queues, setQueues] = useState<{ a: any[]; b: any[] }>({ a: [], b: [] });
  const [busy, setBusy] = useState<BattleEventType | null>(null);
  const [picker, setPicker] = useState<"a" | "b" | null>(null);

  useEffect(() => {
    let cancelled = false;
    queuesFn({ data: { matchId } })
      .then((q: any) => { if (!cancelled) setQueues(q); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [matchId, votingStatus, activeSide, currentRound]);

  async function emit(type: BattleEventType, payload?: { trackId?: string }) {
    setBusy(type);
    try {
      await dispatchFn({ data: { matchId, type, payload } });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      toast.error(msg.replace(/^INVALID_TRANSITION:\s*/, "Cannot: "));
    } finally {
      setBusy(null);
      // Always resync — recovers from stale state (e.g. match was cancelled
      // by another client) so the UI flips back to the correct controls.
      onAfterEmit?.();
    }
  }

  const isFinalRound = currentRound >= totalRounds;
  const completed = matchStatus === "completed" || matchStatus === "cancelled";

  if (completed) return null;

  return (
    <div className="border-t border-white/10 bg-black/40">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Host controls</span>

        {!currentRoundExists && (
          <ControlButton
            label={currentRound === 0 ? "Start Battle" : `Start Round ${currentRound + 1}`}
            icon={<Play className="h-3 w-3" />}
            primary
            loading={busy === "START_ROUND"}
            onClick={() => emit("START_ROUND")}
          />
        )}

        {currentRoundExists && (
          <>
            <ControlButton
              label={`Play ${artistAName}`}
              icon={<Play className="h-3 w-3" />}
              active={activeSide === "a"}
              loading={busy === "PLAY_SIDE_A_TRACK"}
              onClick={() => setPicker("a")}
            />
            <ControlButton
              label={`Play ${artistBName}`}
              icon={<Play className="h-3 w-3" />}
              active={activeSide === "b"}
              loading={busy === "PLAY_SIDE_B_TRACK"}
              onClick={() => setPicker("b")}
            />
            <ControlButton
              label="Stop"
              icon={<Square className="h-3 w-3" />}
              loading={busy === "STOP_TRACK"}
              onClick={() => emit("STOP_TRACK")}
              disabled={!activeSide}
            />

            {votingStatus !== "open" && votingStatus !== "finalized" && (
              <ControlButton
                label="Open Voting"
                icon={<Vote className="h-3 w-3" />}
                loading={busy === "OPEN_VOTING"}
                onClick={() => emit("OPEN_VOTING")}
              />
            )}
            {votingStatus === "open" && (
              <ControlButton
                label="Close Voting"
                icon={<Lock className="h-3 w-3" />}
                loading={busy === "CLOSE_VOTING"}
                onClick={() => emit("CLOSE_VOTING")}
              />
            )}
            {votingStatus !== "finalized" && (
              <ControlButton
                label="Finalize Round"
                icon={<CheckCircle2 className="h-3 w-3" />}
                loading={busy === "FINALIZE_ROUND"}
                onClick={() => emit("FINALIZE_ROUND")}
              />
            )}
            {votingStatus === "finalized" && (
              <ControlButton
                label={isFinalRound ? "Complete Match" : "Next Round"}
                icon={<SkipForward className="h-3 w-3" />}
                primary
                loading={busy === "NEXT_ROUND"}
                onClick={() => emit("NEXT_ROUND")}
              />
            )}
            <ControlButton
              label="End Round"
              icon={<StopCircle className="h-3 w-3" />}
              loading={busy === "END_ROUND"}
              onClick={() => emit("END_ROUND")}
            />
          </>
        )}

        <div className="ml-auto">
          <ControlButton
            label="Cancel Battle"
            icon={<X className="h-3 w-3" />}
            loading={busy === "CANCEL_BATTLE"}
            onClick={() => emit("CANCEL_BATTLE")}
            danger
          />
        </div>
      </div>

      {picker && (
        <TrackPicker
          side={picker}
          tracks={picker === "a" ? queues.a : queues.b}
          onPick={(trackId) => {
            const type: BattleEventType = picker === "a" ? "PLAY_SIDE_A_TRACK" : "PLAY_SIDE_B_TRACK";
            setPicker(null);
            void emit(type, { trackId });
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function ControlButton({
  label, icon, onClick, loading, disabled, primary, active, danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        primary && "text-white",
        active && "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40",
        danger && "border border-red-500/40 text-red-300 hover:bg-red-500/10",
        !primary && !active && !danger && "bg-white/10 text-white hover:bg-white/20",
      )}
      style={primary ? { background: "linear-gradient(135deg, #c53dff, #ff00a6)" } : undefined}
    >
      {icon}
      <span>{loading ? "…" : label}</span>
    </button>
  );
}

function TrackPicker({
  side, tracks, onPick, onClose,
}: {
  side: "a" | "b";
  tracks: any[];
  onPick: (trackId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d18] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold text-white">Pick a track for Side {side.toUpperCase()}</div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-1 hover:bg-white/20">
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>
        {tracks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/50">
            No queued tracks for this artist yet.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-2 text-left hover:bg-white/10"
              >
                {t.cover_url ? (
                  <SignedImg src={t.cover_url} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{t.title}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{t.status}</div>
                </div>
                <Play className="h-4 w-4 text-emerald-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
