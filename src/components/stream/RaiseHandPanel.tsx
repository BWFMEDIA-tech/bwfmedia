import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { respondHand, setParticipantMute } from "@/lib/stage.functions";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, X as XIcon, Mic, MicOff, Camera, CameraOff, Sofa, Sparkles } from "lucide-react";
import type { HandRequest } from "@/lib/useStageState";
import { SignedImg } from "@/components/ui/signed-img";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

export function RaiseHandPanel({ hands, streamId }: { hands: HandRequest[]; streamId?: string | null }) {
  const respond = useServerFn(respondHand);
  const muteFn = useServerFn(setParticipantMute);
  const [pending, setPending] = useState<HandRequest | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (requestId: string, action: "accept_stage" | "accept_green_room" | "decline") => {
    try {
      await respond({ data: { requestId, action } });
      toast.success(action === "decline" ? "Declined" : action === "accept_stage" ? "Promoted to stage" : "Sent to green room");
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  const openPromote = (r: HandRequest) => {
    setMicOn(true);
    setCamOn(false);
    setPending(r);
  };

  const confirmPromote = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      // Camera toggle controls whether the guest gets a video tile on stage.
      // OFF = audio-only on stage (no video box). ON = full A/V publish.
      await respond({
        data: {
          requestId: pending.id,
          action: "accept_stage",
          allowCamera: camOn,
        },
      });
      // Apply optional mute. Camera is host's spoken intent; the guest still
      // controls their own publish state, so we surface a toast for clarity.
      if (!micOn && streamId) {
        try {
          await muteFn({
            data: {
              streamId,
              targetUserId: pending.user_id,
              mute: true,
              durationMinutes: 60,
            },
          });
        } catch {
          /* non-fatal */
        }
      }
      toast.success(
        `${pending.display_name ?? "Guest"} is on stage — mic ${micOn ? "on" : "muted"}, camera ${camOn ? "on" : "off"}`,
      );
      setPending(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Promote failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <div className="rounded-2xl border border-white/5 bg-[#0d0d18] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-widest text-white">RAISE HAND REQUESTS</span>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: PURPLE }}>
            {hands.length}
          </span>
        </div>
      </div>
      {hands.length === 0 ? (
        <p className="text-xs text-white/40">No pending requests.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {hands.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <Link to="/user/$id" params={{ id: r.user_id }} className="shrink-0">
                {r.avatar_url ? (
                  <SignedImg src={r.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }} />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold text-white">
                  {r.display_name ?? "Listener"}
                  <CheckCircle2 className="h-3 w-3" style={{ color: BLUE }} />
                </div>
                <div className="truncate text-[10px] text-white/50">wants to join as guest</div>
              </div>
              <button
                onClick={() => openPromote(r)}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
                style={{ background: PURPLE }}
              >
                Allow
              </button>
              <button onClick={() => act(r.id, "accept_green_room")} className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/5">
                Green
              </button>
              <button onClick={() => act(r.id, "decline")} className="rounded-md p-1 text-white/50 hover:text-white">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {hands.length > 5 && (
        <button className="mt-3 flex w-full items-center justify-between text-xs text-white/70 hover:text-white">
          View all requests <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>

    {pending && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={() => !busy && setPending(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d18] p-5 shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-3">
            {pending.avatar_url ? (
              <SignedImg src={pending.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div
                className="h-11 w-11 rounded-full"
                style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-sm font-bold text-white">
                Bring {pending.display_name ?? "this listener"} on stage?
                <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              </div>
              <p className="text-[11px] text-white/50">They'll be promoted from the crowd to a speaker slot.</p>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <ToggleRow
              icon={micOn ? Mic : MicOff}
              label="Allow microphone"
              hint={micOn ? "Mic on when they join" : "Joins muted — host can unmute later"}
              on={micOn}
              onChange={setMicOn}
            />
            <ToggleRow
              icon={camOn ? Camera : CameraOff}
              label="Allow camera"
              hint={camOn ? "Camera on when they join" : "Audio-only on entry"}
              on={camOn}
              onChange={setCamOn}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={async () => {
                if (!pending) return;
                setBusy(true);
                try {
                  await act(pending.id, "accept_green_room");
                  setPending(null);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/5 disabled:opacity-50"
            >
              <Sofa className="h-3.5 w-3.5" /> Green room
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => !busy && setPending(null)}
                disabled={busy}
                className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/70 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPromote}
                disabled={busy}
                className="rounded-lg px-3.5 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` }}
              >
                {busy ? "Promoting…" : "Confirm & Promote"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  hint,
  on,
  onChange,
}: {
  icon: any;
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        on
          ? "border-violet-400/40 bg-violet-500/10"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <Icon className={`h-4 w-4 ${on ? "text-violet-200" : "text-white/50"}`} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-white">{label}</div>
        <div className="text-[10px] text-white/45">{hint}</div>
      </div>
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
          on ? "bg-violet-500" : "bg-white/10"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`}
        />
      </span>
    </button>
  );
}