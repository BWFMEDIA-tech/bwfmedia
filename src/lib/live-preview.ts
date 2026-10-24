export const LIVE_PREVIEW_MS = 15_000;
export const LIVE_PREVIEW_ID_PREFIX = "preview_";

export function previewGrant(room: string) {
  return { room, roomJoin: true, canSubscribe: true, canPublish: false,
    canPublishData: false, roomAdmin: false, roomCreate: false };
}

export function schedulePreviewEnd(end: () => void) {
  const timer = setTimeout(end, LIVE_PREVIEW_MS);
  return () => clearTimeout(timer);
}