/** Push services only; never permit subscriptions to become an SSRF proxy. */
export function validPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      (u.hostname === "fcm.googleapis.com" || u.hostname === "updates.push.services.mozilla.com" ||
        u.hostname === "web.push.apple.com" || u.hostname.endsWith(".push.apple.com"));
  } catch { return false; }
}

export function pushLink(link: string | null) {
  if (!link || !link.startsWith("/") || link.startsWith("//") || /[\\\u0000-\u001f]/.test(link)) return "/notifications";
  return link;
}

export function pushAllowed(type: string, p: { push: boolean; live_alerts: boolean; battle_alerts: boolean; message_alerts: boolean; follower_alerts: boolean; music_alerts: boolean } | null) {
  if (!p?.push) return false;
  if (type.startsWith("battle")) return p.battle_alerts;
  if (type === "direct_message") return p.message_alerts;
  if (type === "new_follower") return p.follower_alerts;
  if (type === "new_music") return p.music_alerts;
  if (type === "announcement_event" || type === "live_stream_started") return p.live_alerts;
  return true;
}