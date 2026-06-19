/**
 * Convert raw getUserMedia / getDisplayMedia / WebRTC errors into
 * user-friendly messages with an actionable hint.
 */
export type FriendlyMediaError = {
  title: string;
  hint: string;
  code: string;
};

export function friendlyMediaError(
  e: unknown,
  source: "mic" | "camera" | "screen" | "stream" = "mic",
): FriendlyMediaError {
  const name = (e as any)?.name ?? "";
  const message = (e as any)?.message ?? String(e ?? "Unknown error");
  const labelMap = { mic: "Microphone", camera: "Camera", screen: "Screen share", stream: "Stream" } as const;
  const label = labelMap[source];

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        code: name,
        title: `${label} permission denied`,
        hint: `Click the lock icon in your browser's address bar and allow ${label.toLowerCase()} access, then try again.`,
      };
    case "NotFoundError":
    case "OverconstrainedError":
      return {
        code: name,
        title: `No ${label.toLowerCase()} device found`,
        hint: `Connect a ${label.toLowerCase()} device and refresh the page.`,
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        code: name,
        title: `${label} is in use by another app`,
        hint: `Close other apps using your ${label.toLowerCase()} (Zoom, OBS, Meet) and try again.`,
      };
    case "AbortError":
      return {
        code: name,
        title: `${label} request was cancelled`,
        hint: `Click the source toggle again to retry.`,
      };
    case "TypeError":
      return {
        code: name,
        title: `${label} not available on this connection`,
        hint: `Media capture requires a secure (HTTPS) context. Open the studio over HTTPS and retry.`,
      };
    default:
      return {
        code: name || "MediaError",
        title: `${label} could not start`,
        hint: message || `Reload the page and retry. If the issue persists, restart your browser.`,
      };
  }
}