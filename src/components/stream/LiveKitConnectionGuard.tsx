import { AlertTriangle } from "lucide-react";

export type LiveKitFatalKind = "quota" | "auth" | "stage_full" | "other";

export function classifyLiveKitError(error: unknown): LiveKitFatalKind | null {
  const msg = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  const status = (error as any)?.status ?? (error as any)?.code;
  if (!msg && !status) return null;
  if (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("limit exceeded") ||
    msg.includes("connection minutes") ||
    msg.includes("rate limit")
  ) {
    return "quota";
  }
  if (msg.includes("unauthorized") || msg.includes("invalid token") || msg.includes("token expired") || status === 401) {
    return "auth";
  }
  if (
    msg.includes("max participants") ||
    msg.includes("room is full") ||
    msg.includes("stage is full") ||
    msg.includes("participant limit")
  ) {
    return "stage_full";
  }
  // Treat repeated transport failures (1006) as recoverable — not fatal here.
  return null;
}

export function LiveKitFatalBanner({
  kind,
  detail,
  onRetry,
}: {
  kind: LiveKitFatalKind;
  detail?: string;
  onRetry?: () => void;
}) {
  const title =
    kind === "quota"
      ? "Live streaming temporarily unavailable"
      : kind === "auth"
        ? "Streaming session expired"
        : kind === "stage_full"
          ? "Stage is full"
          : "Streaming connection failed";
  const body =
    kind === "quota"
      ? "The live streaming service has reached its connection limit. Reconnect attempts have been stopped to protect your session. Please try again later or contact the project owner to upgrade capacity."
      : kind === "auth"
        ? "Your streaming credentials are no longer valid. Please refresh the page and rejoin."
        : kind === "stage_full"
          ? "This room has reached its participant limit. Wait for someone to leave, or ask the host to free a slot."
          : "We couldn't reach the streaming server. Reconnect attempts have been stopped.";
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-amber-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-200">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{body}</p>
          {detail ? (
            <p className="mt-2 truncate text-[10px] uppercase tracking-wider text-amber-200/60">
              {detail}
            </p>
          ) : null}
          {onRetry ? (
            <button
              onClick={onRetry}
              className="mt-3 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}