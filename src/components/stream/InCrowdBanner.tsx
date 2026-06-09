import { Ear, MicOff, Hand } from "lucide-react";
import { RaiseHandButton } from "./RaiseHandButton";
import type { AuthState } from "@/lib/auth-context";

/**
 * Persistent banner shown to viewers who are in the crowd (listening only).
 * Makes it unambiguous that their mic/camera are off and that they must be
 * invited by the host to go on stage.
 */
export function InCrowdBanner({
  streamId,
  auth,
  mode,
}: {
  streamId: string;
  auth: AuthState;
  mode: "broadcast" | "stage";
}) {
  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-[#0d0d18] to-blue-500/[0.06] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            boxShadow: "0 8px 24px rgba(139,92,246,0.35)",
          }}
        >
          <Ear className="h-5 w-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide text-white">You're in the Crowd</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">
              <MicOff className="h-3 w-3" /> Muted
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-white/65">
            {mode === "stage"
              ? "You can hear the stage but your mic is off. Raise your hand to ask the host to bring you up."
              : "You're listening in. Your mic and camera stay off until the host invites you onto the stage."}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <RaiseHandButton streamId={streamId} auth={auth} />
          <span className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
            <Hand className="h-3 w-3" /> One tap to request
          </span>
        </div>
      </div>
    </div>
  );
}