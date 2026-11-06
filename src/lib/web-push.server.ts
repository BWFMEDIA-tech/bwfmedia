import { createServerOnlyFn } from "@tanstack/react-start";
import { p256 } from "@noble/curves/p256";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { pushAllowed, pushLink, validPushEndpoint } from "./web-push";

// A stable app-generated seed is kept in encrypted secrets. Never log/export private material.
export const vapidFromSeed = createServerOnlyFn(async (seed: string) => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`Tunevio Web Push VAPID v1:${seed}`)));
  const scalar = BigInt(`0x${Array.from(digest, b => b.toString(16).padStart(2, "0")).join("")}`) % (p256.CURVE.n - 1n) + 1n;
  const key = Uint8Array.from(scalar.toString(16).padStart(64, "0").match(/../g) ?? [], s => parseInt(s, 16));
  const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { subject: "https://tunevio.com", publicKey: base64(p256.getPublicKey(key, false)), privateKey: base64(key) };
});

export const deliverInboxPush = createServerOnlyFn(async (notificationId: string, seed: string, onlyEndpoint?: string) => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: n, error } = await db.from("notifications").select("id,user_id,type,title,body,link").eq("id", notificationId).maybeSingle();
  if (error || !n) throw new Error("Notification unavailable");
  const { data: preferences, error: prefError } = await db.from("notification_preferences").select("push,live_alerts,battle_alerts,message_alerts,follower_alerts,music_alerts").eq("user_id", n.user_id).maybeSingle();
  if (prefError) throw new Error("Preferences unavailable");
  if (!pushAllowed(n.type, preferences)) return { accepted: 0, failed: 0 };
  let deviceQuery = db.from("web_push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", n.user_id).eq("enabled", true);
  if (onlyEndpoint) deviceQuery = deviceQuery.eq("endpoint", onlyEndpoint);
  const { data: devices, error: deviceError } = await deviceQuery;
  if (deviceError) throw new Error("Devices unavailable");
  const vapid = await vapidFromSeed(seed);
  let accepted = 0, failed = 0;
  await Promise.all((devices ?? []).map(async device => {
    if (!validPushEndpoint(device.endpoint)) return;
    // Unique claim before any external request prevents replay/concurrent duplicate sends.
    const { error: claimError } = await db.from("notification_push_deliveries").insert({ notification_id: n.id, subscription_id: device.id });
    if (claimError) return;
    let code: number | null = null;
    let status: "sent" | "failed" | "expired" = "failed";
    try {
      const payload = await buildPushPayload({ data: { id: n.id, title: n.title.slice(0, 120), body: n.body?.slice(0, 250) ?? "", link: pushLink(n.link) }, options: { ttl: 3600, urgency: "normal", topic: n.id.replace(/-/g, "") } }, { endpoint: device.endpoint, expirationTime: null, keys: { p256dh: device.p256dh, auth: device.auth } }, vapid);
      const response = await fetch(device.endpoint, { ...payload, redirect: "error", signal: AbortSignal.timeout(10000) });
      code = response.status;
      if (response.ok) { status = "sent"; accepted++; }
      else { failed++; if (code === 404 || code === 410) { status = "expired"; await db.from("web_push_subscriptions").update({ enabled: false }).eq("id", device.id); } }
    } catch { failed++; }
    await db.from("notification_push_deliveries").update({ status, response_code: code, finished_at: new Date().toISOString() }).eq("notification_id", n.id).eq("subscription_id", device.id);
  }));
  return { accepted, failed };
});