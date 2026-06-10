import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { updateStreamMode } from "@/lib/stage.functions";
import { toast } from "sonner";
import { Lock, Unlock, Video, Mic, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PURPLE = "#8b5cf6";
const BLUE = "#3b82f6";

export function ModeToggle({
  streamId,
  mode,
  stageLocked,
  onLocalChange,
}: {
  streamId: string | null;
  mode: "broadcast" | "stage";
  stageLocked: boolean;
  onLocalChange?: (mode: "broadcast" | "stage") => void;
}) {
  const update = useServerFn(updateStreamMode);

  const set = async (next: "broadcast" | "stage") => {
    if (next === mode) return;
    // Allow local switching before going live
    onLocalChange?.(next);
    if (!streamId) return;
    try { await update({ data: { streamId, mode: next } }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const toggleLock = async () => {
    if (!streamId) return;
    try { await update({ data: { streamId, stageLocked: !stageLocked } }); toast.success(stageLocked ? "Stage unlocked" : "Stage locked"); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-[#0d0d18] p-2">
      <button
        onClick={() => set("broadcast")}
        className={cn(
          "flex-1 rounded-xl px-4 py-3 text-xs font-bold tracking-widest text-white transition disabled:opacity-50",
          mode === "broadcast" ? "" : "bg-white/5 text-white/60 hover:bg-white/10",
        )}
        style={mode === "broadcast" ? { background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` } : undefined}
      >
        <Video className="mr-1 inline h-3.5 w-3.5" />
        BROADCAST MODE (Video)
      </button>
      <Link
        to={streamId ? "/play/$room" : "/play"}
        params={streamId ? { room: streamId } : undefined as any}
        className="flex-1 rounded-xl px-4 py-3 text-center text-xs font-bold tracking-widest text-white transition hover:opacity-90"
        style={{ background: `linear-gradient(135deg, #ec4899, ${PURPLE})` }}
        title="Open BWFPLAY Live Arena"
      >
        <Music2 className="mr-1 inline h-3.5 w-3.5" />
        PLAY ARENA
      </Link>
      <button
        onClick={() => set("stage")}
        className={cn(
          "flex-1 rounded-xl px-4 py-3 text-xs font-bold tracking-widest text-white transition disabled:opacity-50",
          mode === "stage" ? "" : "bg-white/5 text-white/60 hover:bg-white/10",
        )}
        style={mode === "stage" ? { background: `linear-gradient(135deg, ${PURPLE}, ${BLUE})` } : undefined}
      >
        <Mic className="mr-1 inline h-3.5 w-3.5" />
        STAGE MODE (Audio)
      </button>
      <Link
        to={streamId ? "/play/$room" : "/play"}
        params={streamId ? { room: streamId } : undefined as any}
        className="flex-1 rounded-xl px-4 py-3 text-center text-xs font-bold tracking-widest text-white transition hover:opacity-90"
        style={{ background: `linear-gradient(135deg, #ec4899, ${PURPLE})` }}
        title="Open BWFPLAY Live Arena"
      >
        <Music2 className="mr-1 inline h-3.5 w-3.5" />
        PLAY ARENA
      </Link>
      <button
        onClick={toggleLock}
        disabled={!streamId}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
        title={stageLocked ? "Unlock stage" : "Lock stage"}
      >
        {stageLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}