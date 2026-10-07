const KEY = "tunevio_host_ref";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HostReferral = { hostId: string; source: "link" | "live_room"; streamId?: string };

/** Remember who referred this visitor. A personal link always wins over a live room. */
export function saveHostReferral(ref: HostReferral) {
  if (typeof window === "undefined" || !UUID.test(ref.hostId)) return;
  const prev = readHostReferral();
  if (prev?.source === "link" && ref.source === "live_room") return;
  localStorage.setItem(KEY, JSON.stringify({ ...ref, at: Date.now() }));
}

export function readHostReferral(): HostReferral | null {
  if (typeof window === "undefined") return null;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!v || !UUID.test(v.hostId) || Date.now() - (v.at ?? 0) > 30 * 864e5) return null;
    return v;
  } catch { return null; }
}

export function hostReferralLink(hostId: string) {
  return `${window.location.origin}/signup?ref=${hostId}`;
}
