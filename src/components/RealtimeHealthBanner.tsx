import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { resetRealtimeHealth, useRealtimeHealth } from "@/lib/realtime-health";

/**
 * Sticky status strip rendered globally. Stays hidden while everything is
 * healthy; surfaces a single concise message when any realtime surface
 * degrades. The room UI keeps rendering underneath (degraded mode) so users
 * can still chat, browse the queue, and queue votes for reconnect-sync.
 */
export function RealtimeHealthBanner() {
  const health = useRealtimeHealth();
  if (health.status === "connected") return null;

  const { title, body, tone, icon: Icon } = describe(health.status);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-[60] w-full border-b ${tone}`}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2 text-xs">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          <div className="truncate opacity-80">{body}</div>
        </div>
        {(health.status === "quota_exceeded" ||
          health.status === "auth_failed" ||
          health.status === "degraded") && (
          <button
            type="button"
            onClick={resetRealtimeHealth}
            className="ml-2 inline-flex items-center gap-1 rounded-md border border-current/40 px-2 py-1 text-[11px] font-semibold hover:bg-white/5"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function describe(status: ReturnType<typeof useRealtimeHealth>["status"]) {
  switch (status) {
    case "reconnecting":
      return {
        title: "Reconnecting…",
        body: "Live connection dropped — restoring the stream.",
        tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
        icon: RefreshCw,
      };
    case "degraded":
      return {
        title: "Limited mode",
        body: "Live audio/video is unavailable. Chat, queue, and votes still work and will sync when the stream returns.",
        tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
        icon: WifiOff,
      };
    case "quota_exceeded":
      return {
        title: "Live streaming temporarily unavailable",
        body: "Capacity limit reached. Chat and queue stay active; live audio/video will resume automatically.",
        tone: "border-amber-500/30 bg-amber-500/10 text-amber-100",
        icon: AlertTriangle,
      };
    case "auth_failed":
      return {
        title: "Session expired",
        body: "Refresh the page to rejoin the live stream. Chat remains active.",
        tone: "border-red-500/30 bg-red-500/10 text-red-100",
        icon: AlertTriangle,
      };
    default:
      return {
        title: "",
        body: "",
        tone: "",
        icon: AlertTriangle,
      };
  }
}